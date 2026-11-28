'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';

export default function ProfilePage() {
  const [nickname, setNickname] = useState('');
  const [teamName, setTeamName] = useState('');
  const [role, setRole] = useState('Giocatore');
  const [teamRole, setTeamRole] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState('Notifiche non ancora attivate.');
  const [pushEnabled, setPushEnabled] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushStatus('Notifiche non supportate da questo browser.');
      return;
    }
    setPushEnabled(false);
    setPushStatus(Notification.permission === 'granted' ? 'Permesso browser concesso, ma la registrazione COURTLY non è ancora verificata. Premi Attiva notifiche.' : Notification.permission === 'denied' ? 'Permesso notifiche bloccato dal browser.' : 'Notifiche non ancora attivate.');
  }, []);
  function urlBase64ToUint8Array(base64: string) {
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const raw = window.atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
  }
  async function enablePush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) { setPushStatus('Push non supportate da questo browser.'); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPushStatus(permission === 'denied' ? 'Permesso negato: abilitalo nelle impostazioni del browser.' : 'Attivazione annullata.'); return; }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) { setPushEnabled(false); setPushStatus('Configurazione push incompleta: manca la chiave VAPID pubblica. Il permesso del browser da solo non salva le notifiche.'); return; }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const readyRegistration = await navigator.serviceWorker.ready;
      const subscription = await readyRegistration.pushManager.getSubscription() || await readyRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) { setPushStatus('Push creata sul dispositivo, ma serve un account COURTLY autenticato per salvarla sul server.'); return; }
      const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ subscription }) });
      if (!response.ok) { const result = await response.json().catch(() => ({})); setPushEnabled(false); setPushStatus(`Server push (${response.status}): ${result.detail || result.error || 'registrazione non riuscita'}`); return; }
      setPushEnabled(true);
      setPushStatus('Push attive e dispositivo registrato sul server.');
    } catch { setPushStatus('Attivazione push non riuscita. Verifica browser e configurazione VAPID.'); }
  }
  async function sendTestPush() {
    if (!pushEnabled) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setPushStatus('Sessione scaduta: accedi di nuovo per inviare la prova.'); return; }
      const response = await fetch('/api/push/test', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.sent) { setPushStatus('Push remota non ricevuta dal servizio. Controlla registrazione e configurazione.'); return; }
      setPushStatus('Notifica push remota inviata al dispositivo.');
    } catch { setPushStatus('Invio della notifica push di prova non riuscito.'); }
  }


  useEffect(() => {
    try {
      setNickname(localStorage.getItem('courtly_demo_nickname') || '');
      setTeamName(localStorage.getItem('courtly_demo_team_name') || '');
      setRole(localStorage.getItem('courtly_demo_role') === 'coach' ? 'Coach' : 'Giocatore');
      setTeamRole(localStorage.getItem('courtly_demo_team_role') || '');
      if (isSupabaseConfigured) {
        void (async () => {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData.session?.user.id;
          if (!userId) return;
          const { data: profile } = await supabase.from('profiles').select('nickname,team_id,role,playing_position').eq('id', userId).maybeSingle();
          if (profile) {
            if (profile.nickname) setNickname(profile.nickname);
            if (profile.team_id) {
              const { data: team } = await supabase.from('teams').select('name').eq('id', profile.team_id).maybeSingle();
              if (team?.name) setTeamName(team.name);
            }
            if (profile.role) setRole(profile.role === 'coach' ? 'Coach' : 'Giocatore');
            if (profile.playing_position) {
              setTeamRole(profile.playing_position);
              localStorage.setItem('courtly_demo_team_role', profile.playing_position);
            }
          }
        })();
      }
    } catch {
      setNotice('Non è stato possibile leggere il profilo da questo dispositivo.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanNickname = nickname.trim();
    const cleanTeam = teamName.trim();
    if (cleanNickname.length < 3) { setNotice('Il nickname deve contenere almeno 3 caratteri.'); return; }
    if (isSupabaseConfigured) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) { setNotice(sessionError.message); return; }
      const userId = sessionData.session?.user.id;
      if (!userId) { setNotice('Sessione non autenticata: accedi nuovamente per salvare il ruolo in campo nel database.'); return; }
      const { data: savedProfile, error } = await supabase.from('profiles').update({ nickname: cleanNickname, playing_position: teamRole.trim() || null }).eq('id', userId).select('id,playing_position').maybeSingle();
      if (error) { setNotice(`Errore salvataggio profilo: ${error.message}`); return; }
      if (!savedProfile || savedProfile.playing_position !== (teamRole.trim() || null)) { setNotice('Il database non ha confermato il salvataggio del ruolo. Riprova.'); return; }
    }
    try {
      localStorage.setItem('courtly_demo_nickname', cleanNickname);
      localStorage.setItem('courtly_demo_team_name', cleanTeam);
      localStorage.setItem('courtly_demo_team_role', teamRole.trim());
      // Synchronize the profile's selected position into this device's demo roster.
      const rosterKey = 'courtly-team-demo-v1';
      const rosterRaw = localStorage.getItem(rosterKey);
      if (rosterRaw) {
        const roster = JSON.parse(rosterRaw);
        if (roster && Array.isArray(roster.members)) {
          const currentRole = localStorage.getItem('courtly_demo_role') === 'coach' ? 'Coach' : 'Player';
          const idx = roster.members.findIndex((member: any) => member.nickname?.trim().toLowerCase() === cleanNickname.toLowerCase());
          if (idx >= 0) {
            roster.members[idx] = { ...roster.members[idx], position: currentRole === 'Player' ? teamRole.trim() : undefined };
          } else if (cleanTeam && currentRole === 'Player') {
            roster.members.push({ id: 'current-user-profile', nickname: cleanNickname, role: 'Player', position: teamRole.trim() });
          }
          localStorage.setItem(rosterKey, JSON.stringify(roster));
        }
      } else if (cleanTeam && localStorage.getItem('courtly_demo_role') !== 'coach') {
        localStorage.setItem(rosterKey, JSON.stringify({ name: cleanTeam, category: 'Categoria da definire', season: '2026/27', members: [{ id: 'current-user-profile', nickname: cleanNickname, role: 'Player', position: teamRole.trim() }] }));
      }
    } catch {
      setNotice('Salvataggio locale non disponibile nel browser.');
      return;
    }
    setNickname(cleanNickname);
    setTeamName(cleanTeam);
    setTeamRole(teamRole.trim());
    setNotice(isSupabaseConfigured ? 'Profilo e ruolo in campo salvati nel database.' : 'Profilo aggiornato in questa demo locale.');
  }

  if (loading) return <main className="auth-wrap"><p>Caricamento profilo…</p></main>;
  return <main className="auth-wrap"><div className="auth-card">
    <Link className="brand auth-brand" href="/dashboard"><span className="brand-mark">C</span> COURTLY</Link>
    <h1>Il tuo profilo</h1><p className="muted">Il nickname è il nome mostrato agli altri giocatori.</p>
    <section style={{margin:'18px 0',padding:18,background:'#152235',border:'2px solid #ff8b3d',borderRadius:16,color:'#fff',display:'block',visibility:'visible'}}>
      <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>🔔 NOTIFICHE COURTLY</div>
      <p style={{margin:'0 0 12px',fontSize:13,color:'#c4d0df'}}>{pushStatus}</p>
      <button type="button" onClick={enablePush} disabled={pushEnabled} style={{width:'100%',padding:14,border:0,borderRadius:12,background:pushEnabled?'#334155':'#ff8b3d',color:'#fff',fontWeight:800,fontSize:15,cursor:'pointer'}}>{pushEnabled ? 'Notifiche attive' : '🔔 ATTIVA NOTIFICHE'}</button>
      {pushEnabled && <button type="button" onClick={sendTestPush} style={{width:'100%',marginTop:10,padding:14,border:0,borderRadius:12,background:'#ff8b3d',color:'#fff',fontWeight:800,fontSize:15,cursor:'pointer'}}>Invia notifica di prova</button>}
    </section>
    <form onSubmit={save}>
      <label>Nickname<input value={nickname} onChange={e => setNickname(e.target.value)} minLength={3} maxLength={20} required /></label>
      <label>Squadra<input value={teamName} onChange={e => setTeamName(e.target.value)} maxLength={40} /></label>
      <label>Accesso<input value={role} readOnly /></label>
      <section className="profile-position-card"><div className="profile-position-heading"><span className="profile-position-icon">🏀</span><div><strong>RUOLO IN CAMPO</strong><small>La tua posizione nella squadra</small></div></div><label className="profile-position-label">Seleziona la tua posizione<select className="profile-position-select" value={teamRole} onChange={e => setTeamRole(e.target.value)} required><option value="">Scegli una posizione</option><option>Playmaker</option><option>Guardia</option><option>Ala</option><option>Ala grande</option><option>Centro</option></select></label><p className="profile-position-note">La posizione viene salvata nel tuo profilo COURTLY e sincronizzata con il database della squadra.</p></section>
      <button className="btn-primary" type="submit">Salva profilo</button>
    </form>
    {notice && <div className="auth-message" role="status">{notice}</div>}
    <p className="auth-switch"><Link href="/dashboard">Torna alla dashboard</Link></p>
  </div></main>;
}
