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
    setPushEnabled(Notification.permission === 'granted');
    setPushStatus(Notification.permission === 'granted' ? 'Notifiche consentite su questo dispositivo.' : Notification.permission === 'denied' ? 'Permesso notifiche bloccato dal browser.' : 'Notifiche non ancora attivate.');
  }, []);
  async function enablePush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) { setPushStatus('Browser non compatibile.'); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPushStatus(permission === 'denied' ? 'Permesso negato: abilitalo nelle impostazioni del browser.' : 'Attivazione annullata.'); return; }
      await navigator.serviceWorker.register('/sw.js');
      setPushEnabled(true);
      setPushStatus('Notifiche attivate. Push remoto da collegare al server.');
    } catch { setPushStatus('Attivazione non riuscita. Riprova.'); }
  }
  async function sendTestPush() {
    if (!pushEnabled) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('COURTLY · Test', { body: 'Le notifiche sul dispositivo sono attive! 🏀', icon: '/courtly-icon.svg', data: { url: '/notifications' } });
      setPushStatus('Notifica di test inviata.');
    } catch { setPushStatus('Impossibile mostrare la notifica di test.'); }
  }


  useEffect(() => {
    try {
      setNickname(localStorage.getItem('courtly_demo_nickname') || '');
      setTeamName(localStorage.getItem('courtly_demo_team_name') || '');
      setRole(localStorage.getItem('courtly_demo_role') === 'coach' ? 'Coach' : 'Giocatore');
      setTeamRole(localStorage.getItem('courtly_demo_team_role') || '');
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
      if (userId) {
        const { error } = await supabase.from('profiles').update({ nickname: cleanNickname }).eq('id', userId);
        if (error) { setNotice(error.message); return; }
      }
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
    setNotice('Profilo aggiornato.');
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
      <section className="profile-position-card"><div className="profile-position-heading"><span className="profile-position-icon">🏀</span><div><strong>RUOLO IN CAMPO</strong><small>La tua posizione nella squadra</small></div></div><label className="profile-position-label">Seleziona la tua posizione<select className="profile-position-select" value={teamRole} onChange={e => setTeamRole(e.target.value)} required><option value="">Scegli una posizione</option><option>Playmaker</option><option>Guardia</option><option>Ala</option><option>Ala grande</option><option>Centro</option></select></label><p className="profile-position-note">La posizione verrà salvata nel tuo profilo su questo dispositivo.</p></section>
      <button className="btn-primary" type="submit">Salva profilo</button>
    </form>
    {notice && <div className="auth-message" role="status">{notice}</div>}
    <section className="profile-position-card" style={{marginTop:18}}>
      <div className="profile-position-heading"><span className="profile-position-icon">🔔</span><div><strong>NOTIFICHE COURTLY</strong><small>Avvisi su questo dispositivo</small></div></div>
      <p className="profile-position-note">{pushStatus}</p>
      <button type="button" className="btn-primary" onClick={enablePush} disabled={pushEnabled}>{pushEnabled ? 'Notifiche attive' : 'Attiva notifiche'}</button>
      {pushEnabled && <button type="button" className="btn-primary" style={{marginTop:10}} onClick={sendTestPush}>Invia notifica di prova</button>}
    </section>
    <p className="auth-switch"><Link href="/dashboard">Torna alla dashboard</Link></p>
  </div></main>;
}
