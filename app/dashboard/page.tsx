'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
type Training = { id: string; title: string; date: string; time?: string; location?: string; responses?: Record<string, string> };
type Game = { id: string; opponent: string; date: string; time?: string; venue?: string; homeAway?: 'home'|'away'; responses?: Record<string, string> };
type Team = { name?: string; members?: { nickname: string; role: string }[] };
type EventItem = { id: string; type: string; date: string; time: string; title: string; place: string; responseType: 'presence'|'availability'; value?: string; kind: 'training'|'game' };
const responseLabels: Record<string, string> = { present: 'Ci sarò', absent: 'Non ci sarò', available: 'Disponibile', unavailable: 'Non disponibile' };
const keys = { trainings: 'courtly-trainings-v1', games: 'courtly-games-v1', team: 'courtly-team-demo-v1' };
const dayLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('it-IT',{weekday:'short',day:'2-digit'}).toUpperCase();
export default function Dashboard() {
  const [nickname,setNickname]=useState('Giocatore');
  const [teamName,setTeamName]=useState('La tua squadra');
  const [trainings,setTrainings]=useState<Training[]>([]);
  const [games,setGames]=useState<Game[]>([]);
  const [role,setRole]=useState<'coach'|'player'>('player');
  const [ready,setReady]=useState(false);
  useEffect(()=>{try{
    const n=localStorage.getItem('courtly_demo_nickname');if(n)setNickname(n);
    const r=localStorage.getItem('courtly_demo_role')==='coach'?'coach':'player';setRole(r);
    const t=localStorage.getItem(keys.trainings);if(t){const parsed=JSON.parse(t);if(Array.isArray(parsed))setTrainings(parsed)}
    const g=localStorage.getItem(keys.games);if(g){const parsed=JSON.parse(g);if(Array.isArray(parsed))setGames(parsed)}
    const tm=localStorage.getItem(keys.team);if(tm){const parsed=JSON.parse(tm);if(parsed?.name)setTeamName(parsed.name)}else{const entered=localStorage.getItem('courtly_demo_team_name');if(entered)setTeamName(entered)}
  }catch{}finally{setReady(true)}},[]);
  const events=useMemo<EventItem[]>(()=>[
    ...trainings.map(t=>({id:t.id,type:'ALLENAMENTO',date:t.date,time:t.time||'—',title:t.title,place:t.location||'Luogo da definire',responseType:'presence' as const,value:t.responses?.[nickname],kind:'training' as const})),
    ...games.map(g=>({id:g.id,type:'PARTITA',date:g.date,time:g.time||'—',title:`vs ${g.opponent}`,place:`${g.venue||'Luogo da definire'} · ${g.homeAway==='home'?'Casa':'Trasferta'}`,responseType:'availability' as const,value:g.responses?.[nickname],kind:'game' as const}))
  ].filter(e=>e.date && new Date(`${e.date}T23:59:59`).getTime() >= Date.now()).sort((a,b)=>a.date.localeCompare(b.date)),[trainings,games,nickname]);
  useEffect(() => { if (!ready) return; try { localStorage.setItem(keys.trainings, JSON.stringify(trainings)); localStorage.setItem(keys.games, JSON.stringify(games)); } catch {} }, [trainings, games, ready]);
  const pending=events.filter(e=>!e.value).length;
  const answered=events.filter(e=>e.value).length;
  const attendanceCount=events.filter(e=>e.value==='present'||e.value==='available').length;
  const answer=(event:EventItem,value:string)=>{
    if(event.kind==='training')setTrainings(prev=>prev.map(t=>t.id===event.id?{...t,responses:{...(t.responses||{}),[nickname]:value}}:t));
    else setGames(prev=>prev.map(g=>g.id===event.id?{...g,responses:{...(g.responses||{}),[nickname]:value}}:g));
  };
  const initials=nickname.trim().slice(0,2).toUpperCase()||'🏀';
  return <main className="shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">C</span> COURTLY</div><div className="team-switch">{teamName} · Stagione 2026/27</div>
    <nav><Link className="active" href="/dashboard">◈ Panoramica</Link><Link href="/trainings">▣ Allenamenti</Link><Link href="/teams">♟ Squadra & membri</Link><Link href="/coach">◉ Area coach</Link><Link href="/pro-basket">🏀 Pro Basket</Link><Link href="/games">🏀 Partite</Link><Link href="/calendar">▦ Calendario</Link><Link href="/notifications">♧ Notifiche</Link><Link href="/statistics">▥ Statistiche</Link></nav>
    <Link href="/profile" className="profile profile-link" aria-label="Apri il profilo personale" title="Apri profilo personale"><div className="avatar">{initials}</div><div><b>{nickname}</b><small>{role==='coach'?'Coach':'Giocatore'}</small></div><span className="profile-open-indicator" aria-hidden="true">↗</span></Link></aside>
    <section className="content"><header className="topbar"><span>Dashboard / {role==='coach'?'Coach':'Giocatore'}</span><Link href="/notifications" className="notification">♧ <b>Notifiche</b></Link></header>
      <div className="welcome"><div><p className="eyebrow">SPOGLIATOIO {teamName.toUpperCase()}</p><h1>Pronto a scendere<br/>in campo, {nickname}? <span>🏀</span></h1><p className="muted">La tua settimana, la tua squadra, tutto sotto controllo.</p></div><div className="hero-ball">🏀</div></div>
      <div className="stats"><div className="stat"><small>Risposte date</small><strong>{answered}<span> / {events.length}</span></strong><div className="progress"><i style={{width:`${events.length?Math.min(100,answered/events.length*100):0}%`}}/></div><label>Appuntamenti reali salvati localmente</label></div><div className="stat"><small>Presenze / disponibilità</small><strong>{attendanceCount}</strong><label className="orange">Risposte su questo dispositivo</label></div><div className="stat"><small>Da rispondere</small><strong>{pending}<span> eventi</span></strong><label className={pending?'orange':''}>{pending?'Non dimenticare di rispondere':'Tutto aggiornato'}</label></div></div>
      <div className="section-heading"><h2>Prossimi appuntamenti</h2><Link href="/calendar">Vedi calendario →</Link></div>
      {!ready ? <p className="muted">Caricamento…</p> : events.length === 0 ? <div className="events empty-state"><p>Nessun allenamento o partita salvato.</p><Link href="/trainings">Vai agli allenamenti →</Link></div> : <div className="events">{events.map(e => {
        const value = e.value;
        return <article className="event" key={`${e.kind}-${e.id}`}>
          <div className="date"><b>{e.date.slice(8,10)}</b><small>{dayLabel(e.date).split(' ')[0]}</small></div>
          <div className="event-info"><small className="tag">{e.type}</small><h3>{e.title}</h3><p>◷ {e.time} &nbsp; · &nbsp;⌖ {e.place}</p></div>
          <div className="event-action attendance-action">
            {value ? <span className={value === 'present' || value === 'available' ? 'present' : 'absent'}>{responseLabels[value] || value}</span> : <span className="pending">Da confermare</span>}
            {!value && <div className="attendance-buttons"><button onClick={() => answer(e, e.responseType === 'presence' ? 'present' : 'available')}>{e.responseType === 'presence' ? 'Ci sarò' : 'Disponibile'}</button><button className="decline" onClick={() => answer(e, e.responseType === 'presence' ? 'absent' : 'unavailable')}>{e.responseType === 'presence' ? 'Assente' : 'Non disponibile'}</button></div>}
            {value && <button className="btn-outline" onClick={() => answer(e, '')}>Modifica</button>}
          </div>
        </article>;
      })}</div>}
      <div className="section-heading"><h2>Il tuo spogliatoio</h2><Link href="/teams">Apri roster →</Link></div><div className="team-card"><div className="team-icon">🏀</div><div><h3>{teamName}</h3><p>Il tuo team · Stagione 2026/27</p></div><Link href="/teams">Squadra ↗</Link></div><footer>COURTLY <span>PLAY TOGETHER.</span></footer>
    </section></main>;
}
