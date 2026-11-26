'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';

type Member = { id: string; nickname: string; role: 'Player' | 'Coach'; position?: string; isFirstYear?: boolean };
type Team = { name: string; category?: string; season: string; members: Member[] };
const KEY = 'courtly-team-demo-v1';
const seed: Team = { name: 'Squadra non configurata', category: '', season: 'Stagione da definire', members: [] };
export default function TeamsPage() {
  const [team, setTeam] = useState<Team>(seed);
  const [ready, setReady] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [currentNickname, setCurrentNickname] = useState('');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');
  const [name, setName] = useState('');
  const [season, setSeason] = useState('2026/27');

  useEffect(() => {
    const enteredNickname = localStorage.getItem('courtly_demo_nickname')?.trim() || '';
    const enteredRole = localStorage.getItem('courtly_demo_role') === 'coach' ? 'Coach' : 'Player';
    const savedPosition = localStorage.getItem('courtly_demo_team_role') || '';
    setCurrentNickname(enteredNickname);
    setIsCoach(enteredRole === 'Coach');

    if (isSupabaseConfigured) {
      // In online mode never fall back to browser-local demo roster: it could
      // misrepresent a stale, unrelated team as the current shared team.
      (async () => {
        try {
          // Resolve the team from the authenticated database profile; localStorage is only a fallback.
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          const userId = sessionData.session?.user.id;
          if (!userId) throw new Error('Sessione non autenticata. Effettua nuovamente l’accesso.');
          const { data: ownProfile, error: profileError } = await supabase.from('profiles').select('team_id,nickname,role').eq('id', userId).maybeSingle();
          if (profileError) throw profileError;
          const teamId = ownProfile?.team_id || localStorage.getItem('courtly_shared_team_id');
          if (!teamId) throw new Error('Il tuo profilo non risulta associato a una squadra.');
          localStorage.setItem('courtly_shared_team_id', teamId);
          if (ownProfile?.nickname) setCurrentNickname(ownProfile.nickname);
          if (ownProfile?.role) setIsCoach(ownProfile.role === 'coach');
          // Use the authenticated server endpoint to bypass client-side RLS inconsistencies for roster reads.
          const { data: sessionNow } = await supabase.auth.getSession();
          const accessToken = sessionNow.session?.access_token;
          if (!accessToken) throw new Error('Sessione scaduta. Accedi di nuovo.');
          const response = await fetch('/api/roster', { headers: { Authorization: `Bearer ${accessToken} }, cache: 'no-store' });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Roster non disponibile.');
          const sharedTeam = payload.team;
          const members: Member[] = (payload.members || []).map((row: any) => {
            const memberNickname = row.nickname || 'Membro';
            const localPosition = memberNickname.trim().toLowerCase() === enteredNickname.toLowerCase() ? savedPosition : '';
            return { id: row.id, nickname: memberNickname, role: (row.role === 'coach' || row.role === 'admin' ? 'Coach' : 'Player') as Member['role'], position: localPosition || undefined, isFirstYear: !!row.is_first_year };
          });
          setTeam({ name: sharedTeam.name, category: sharedTeam.category || '', season: sharedTeam.season || '2026/27', members });

        } catch (err) {
          setTeam(seed);
          setNotice(err instanceof Error ? `Roster condiviso non disponibile: ${err.message}` : 'Roster condiviso non disponibile.');
        } finally {
          setReady(true);
        }
      })();
      return;
    }

    // Offline/demo mode: use only this browser's local demo data.
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && 'name' in parsed && 'members' in parsed && Array.isArray((parsed as { members?: unknown }).members)) {
          const oldScaffold = (parsed as Team).name === 'Basket Milano' && (parsed as Team).members.length === 5 && (parsed as Team).members.every(m => ['1','2','3','4','5'].includes(m.id));
          if (oldScaffold) { localStorage.removeItem(KEY); setTeam(seed); }
          else {
            const storedTeam = parsed as Team;
            // Always refresh the current user's position from their profile selection.
            storedTeam.members = storedTeam.members.map(member =>
              member.nickname?.trim().toLowerCase() === enteredNickname.toLowerCase() && member.role === 'Player'
                ? { ...member, position: savedPosition || member.position }
                : member
            );
            setTeam(storedTeam);
          }
        }
      } else {
        const enteredTeam = localStorage.getItem('courtly_demo_team_name')?.trim();
        if (enteredTeam) setTeam(t => ({ ...t, name: enteredTeam }));
        if (enteredNickname) setTeam(t => ({ ...t, members: [{ id: 'current-user', nickname: enteredNickname, role: enteredRole, position: enteredRole === 'Player' ? savedPosition : undefined }] }));
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready && !isSupabaseConfigured) try { localStorage.setItem(KEY, JSON.stringify(team)); } catch {} }, [team, ready]);
  const players = useMemo(() => team.members.filter(m => m.role === 'Player').length, [team]);
  const coaches = team.members.filter(m => m.role === 'Coach').length;

  function createTeam() {
    if (!isCoach) { setNotice('Solo il coach può creare una squadra.'); return; }
    if (!name.trim()) { setNotice('Inserisci il nome della squadra.'); return; }
    let storedNick = 'Coach';
    try { storedNick = localStorage.getItem('courtly_demo_nickname')?.trim() || 'Coach'; } catch {}
    setTeam({ name: name.trim(), category: '', season: season.trim() || 'Stagione da definire', members: [{ id: String(Date.now()), nickname: storedNick, role: 'Coach' }] });
    try { localStorage.setItem('courtly_demo_team_name', name.trim()); } catch {}
    setCreateOpen(false); setNotice('Squadra creata in questa demo locale.');
  }
  function addPlayer() {
    if (!isCoach) { setNotice('Solo il coach può gestire il roster in questa demo.'); return; }
    const cleanNickname = nickname.trim();
    if (!cleanNickname) { setNotice('Inserisci un nickname.'); return; }
    if (joinTeamName.trim().toLocaleLowerCase() !== team.name.trim().toLocaleLowerCase()) { setNotice('Il nome inserito non corrisponde alla squadra disponibile in questa demo.'); return; }
    if (team.members.some(m => m.nickname.toLowerCase() === cleanNickname.toLowerCase())) { setNotice('Nickname già presente nel roster.'); return; }
    setTeam(t => ({ ...t, members: [...t.members, { id: String(Date.now()), nickname: cleanNickname, role: 'Player' }] }));
    setNotice('Giocatore aggiunto al roster demo.'); setNickname(''); setJoinTeamName('');
  }
  async function removeMember(id: string) { if (!isCoach) { setNotice('Solo il coach può rimuovere membri.'); return; } if (isSupabaseConfigured && localStorage.getItem('courtly_shared_team_id')) { const { error } = await supabase.from('team_members').delete().eq('id', id); if (error) { setNotice(`Rimozione non riuscita: ${error.message}`); return; } setTeam(t => ({ ...t, members: t.members.filter(m => m.id !== id) })); setNotice('Membro rimosso dalla squadra condivisa.'); return; } setTeam(t => ({ ...t, members: t.members.filter(m => m.id !== id) })); setNotice('Membro rimosso dal roster demo.'); }

  return <main className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">C</span> COURTLY</div><div className="team-switch">{team.season}</div><nav>
      <Link href="/dashboard">◈ Panoramica</Link><Link href="/trainings">▣ Allenamenti</Link><Link href="/teams" className="active">♟ Squadra & membri</Link><Link href="/coach">◉ Area coach</Link><Link href="/prime-piume">🪶 Le Prime Piume</Link><Link href="/pro-basket">🏀 Pro Basket</Link><Link href="/games">🏀 Partite</Link><Link href="/calendar">▦ Calendario</Link><Link href="/notifications">♧ Notifiche</Link>
    </nav><div className="profile"><div className="avatar">{currentNickname.slice(0,2).toUpperCase() || 'C'}</div><div><b>{currentNickname || 'Profilo'}</b><small>{isCoach?'Coach':'Giocatore'}</small></div></div></aside>
    <section className="content teams-content"><header className="topbar"><span>Dashboard / Squadra</span><Link href="/dashboard" className="notification">← Dashboard</Link></header>
      <div className="teams-hero"><div><p className="eyebrow">TEAM MANAGEMENT</p><h1>Squadra & membri</h1><p className="muted">Roster e staff in un unico posto.</p></div><div className="teams-ball">🏀</div></div>
      {notice && <div className="team-notice" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
      <div className="team-main-card"><div className="team-emblem">🏀</div><div className="team-main-details"><span className="eyebrow">SQUADRA ATTIVA</span><h2>{team.name}</h2><p>Stagione {team.season}</p></div>{isCoach && !isSupabaseConfigured && <button className="btn-primary team-create" onClick={() => setCreateOpen(v => !v)}>{createOpen ? 'Chiudi' : '＋ Crea squadra demo'}</button>}</div>
      {!team.members.length && <p className="muted">Nessun membro registrato. In questa versione demo, i dati della squadra sono salvati solo su questo dispositivo.</p>}<div className="team-metrics"><div><small>Membri</small><strong>{team.members.length}</strong></div><div><small>Giocatori</small><strong>{players}</strong></div><div><small>Coach</small><strong>{coaches}</strong></div></div>
      {isCoach && !isSupabaseConfigured && createOpen && <div className="team-panel"><h3>Nuova squadra</h3><div className="team-form"><label>Nome squadra<input value={name} onChange={e => setName(e.target.value)} placeholder="es. U17 Eagles"/></label><label>Stagione<input value={season} onChange={e => setSeason(e.target.value)}/></label><button className="btn-primary" onClick={createTeam}>Crea squadra</button></div></div>}
      <div className="team-columns"><div className="team-panel roster-panel"><div className="panel-title"><div><h2>Roster</h2><p className="muted">Membri della squadra</p></div><span className="roster-count">{team.members.length}</span></div><div className="member-list">{team.members.map(m => <div className="member-row" key={m.id}><div className="member-avatar">{m.nickname.slice(0, 2).toUpperCase()}</div><div className="member-text"><b>{m.nickname}</b><small>{m.role === 'Coach' ? 'Staff tecnico' : 'Giocatore'}{m.position ? ` · ${m.position}` : ''}</small></div><span className={`member-role ${m.role === 'Coach' ? 'coach-role' : ''}`}>{m.role.toUpperCase()}</span>{isCoach && m.role === 'Player' && isSupabaseConfigured && <button className="remove-member" title={m.isFirstYear ? 'Rimuovi dalle Prime Piume' : 'Aggiungi alle Prime Piume'} onClick={async () => { const next = !m.isFirstYear; const { error } = await supabase.from('team_members').update({ is_first_year: next }).eq('id', m.id); if (error) { setNotice('Modifica Prime Piume non riuscita: ' + error.message); return; } setTeam(t => ({ ...t, members: t.members.map(x => x.id === m.id ? { ...x, isFirstYear: next } : x) })); setNotice(next ? m.nickname + ' aggiunto alle Prime Piume.' : m.nickname + ' rimosso dalle Prime Piume.'); }}>{m.isFirstYear ? '🪶' : '＋'}</button>}{isCoach && <button className="remove-member" title="Rimuovi membro" onClick={() => removeMember(m.id)}>−</button>}</div>)}</div></div>
        {isCoach && <div className="team-panel invite-panel"><h2>Ingresso giocatori</h2><p className="muted">{isSupabaseConfigured ? 'I giocatori entrano scegliendo il ruolo Giocatore e scrivendo esattamente il nome della squadra. La membership viene registrata nel database condiviso.' : 'Nella demo locale, il roster esiste solo su questo dispositivo.'}</p>{!isSupabaseConfigured && <div className="join-form"><label>Nickname<input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Nickname del giocatore"/></label><label>Nome squadra<input value={joinTeamName} onChange={e => setJoinTeamName(e.target.value)} placeholder="Scrivi il nome della squadra"/></label><button className="btn-primary" onClick={addPlayer}>Aggiungi al roster demo</button></div>}<div className="invite-note">{isSupabaseConfigured ? 'Roster online condiviso tramite Supabase.' : 'Demo locale: per la sincronizzazione tra dispositivi configura Supabase.'}</div></div>}
      </div>
      <div className="team-panel team-rules"><h3>Ruoli</h3><div className="role-explainer"><div><span className="role-dot player-dot"/><b>Giocatore</b><p>Risponde agli allenamenti e comunica disponibilità.</p></div><div><span className="role-dot coach-dot"/><b>Coach</b><p>Gestisce roster, allenamenti, partite e convocazioni.</p></div></div></div>
      <footer>COURTLY <span>PLAY TOGETHER.</span></footer>
    </section>
  </main>;
}
