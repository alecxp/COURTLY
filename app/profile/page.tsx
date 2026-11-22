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
    <Link className="brand auth-brand" href="/"><span className="brand-mark">C</span> COURTLY</Link>
    <h1>Il tuo profilo</h1><p className="muted">Il nickname è il nome mostrato agli altri giocatori.</p>
    <form onSubmit={save}>
      <label>Nickname<input value={nickname} onChange={e => setNickname(e.target.value)} minLength={3} maxLength={20} required /></label>
      <label>Squadra<input value={teamName} onChange={e => setTeamName(e.target.value)} maxLength={40} /></label>
      <label>Accesso<input value={role} readOnly /></label>
      <label>Ruolo in campo<select value={teamRole} onChange={e => setTeamRole(e.target.value)}><option value="">Seleziona il tuo ruolo</option><option>Playmaker</option><option>Guardia</option><option>Ala</option><option>Ala grande</option><option>Centro</option><option>Altro</option></select></label>
      <button className="btn-primary" type="submit">Salva profilo</button>
    </form>
    {notice && <div className="auth-message" role="status">{notice}</div>}
    <p className="auth-switch"><Link href="/dashboard">Torna alla dashboard</Link></p>
  </div></main>;
}
