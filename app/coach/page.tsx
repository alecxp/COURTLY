'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSharedContext, loadSharedEvents, splitLocalDateTime } from '../../lib/shared-events';

type Training = { id: string; title: string; date: string; time?: string; location?: string; responses?: Record<string, 'present'|'absent'|'pending'> };
type Game = { id: string; opponent: string; date: string; time?: string; responses?: Record<string, 'available'|'unavailable'|'pending'> };
type Team = { name?: string; members?: { nickname: string; role: string }[] };
const TRAININGS_KEY = 'courtly-trainings-v1';
const GAMES_KEY = 'courtly-games-v1';
const TEAM_KEY = 'courtly-team-demo-v1';
const dateValue = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return undefined;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
};
const formatDate = (value?: string) => { const date = dateValue(value); return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '—'; };

export default function CoachPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [team, setTeam] = useState<Team>({ members: [] });
  const [nickname, setNickname] = useState('Coach');
  const [ready, setReady] = useState(false); const [dataSource,setDataSource]=useState<'local'|'shared'|'error'>('local');
  useEffect(() => { let active=true; const load=async()=>{setNickname(localStorage.getItem('courtly_demo_nickname')?.trim()||'Coach');try{const ctx=await getSharedContext();if(ctx){const [trainingRows,gameRows]=await Promise.all([loadSharedEvents(ctx.supabase,ctx.teamId,'training'),loadSharedEvents(ctx.supabase,ctx.teamId,'game')]);const rosterResult=await ctx.supabase.from('team_members').select('user_id,role,profiles(nickname)').eq('team_id',ctx.teamId);if(rosterResult.error)throw rosterResult.error;const playerRows=(rosterResult.data||[]).filter((m:any)=>m.role==='player'&&typeof m.profiles?.nickname==='string');const names=playerRows.map((m:any)=>m.profiles.nickname);const eventIds=[...trainingRows,...gameRows].map(r=>r.id);const responseResult=eventIds.length?await ctx.supabase.from('event_responses').select('event_id,player_id,response').in('event_id',eventIds):{data:[],error:null};if(responseResult.error)throw responseResult.error;const profileIds=[...new Set([...(rosterResult.data||[]).map((m:any)=>m.user_id),...(responseResult.data||[]).map((r:any)=>r.player_id)])];const profiles=profileIds.length?await ctx.supabase.from('profiles').select('id,nickname').in('id',profileIds):{data:[],error:null};if(profiles.error)throw profiles.error;const nameById=new Map<string,string>((profiles.data||[]).map((p:any)=>[p.id,p.nickname]));const responseMap:Record<string,Record<string,any>>={};(responseResult.data||[]).forEach((r:any)=>{const name=nameById.get(r.player_id);if(name)(responseMap[r.event_id]||={})[name]=r.response});const mapTraining=(r:any):Training=>{const d=splitLocalDateTime(r.starts_at);return{id:r.id,title:r.title,date:d.date,time:d.time,location:r.venue||'',responses:(responseMap[r.id]||{}) as Training['responses']}};const mapGame=(r:any):Game=>{const d=splitLocalDateTime(r.starts_at);return{id:r.id,opponent:r.opponent||r.title,date:d.date,time:d.time,responses:(responseMap[r.id]||{}) as Game['responses']}};if(active){setTrainings(trainingRows.map(mapTraining));setGames(gameRows.map(mapGame));setTeam({name:localStorage.getItem('courtly_demo_team_name')||'Squadra',members:playerRows.map((m:any)=>({nickname:m.profiles.nickname,role:'player'}))});setDataSource('shared');setReady(true);}return;}const t=localStorage.getItem(TRAININGS_KEY);if(t){const parsed=JSON.parse(t);if(Array.isArray(parsed)&&active)setTrainings(parsed)}const g=localStorage.getItem(GAMES_KEY);if(g){const parsed=JSON.parse(g);if(Array.isArray(parsed)&&active)setGames(parsed)}const tm=localStorage.getItem(TEAM_KEY);if(tm){const parsed=JSON.parse(tm);if(parsed&&typeof parsed==='object'&&active)setTeam(parsed)}if(active){setDataSource('local');setReady(true)}}catch{if(active){setTrainings([]);setGames([]);setTeam({members:[]});setDataSource('error');setReady(true)}}};void load();return()=>{active=false}},[]);
  const nextTraining = useMemo(() => trainings.filter(t => t.date && new Date(`${t.date}T23:59:59`).getTime() >= Date.now()).sort((a,b)=>a.date.localeCompare(b.date))[0], [trainings]);
  const nextGame = useMemo(() => games.filter(g => g.date && new Date(`${g.date}T23:59:59`).getTime() >= Date.now()).sort((a,b)=>a.date.localeCompare(b.date))[0], [games]);
  const trainingStats = useMemo(() => { const t = nextTraining; const r = t?.responses || {}; return { present:Object.values(r).filter(v=>v==='present').length, absent:Object.values(r).filter(v=>v==='absent').length, pending:Math.max(0,(team.members||[]).filter(m=>m.role.toLowerCase()==='player').length-Object.keys(r).length) }; }, [nextTraining,team]);
  const gameAvailable = useMemo(() => Object.values(nextGame?.responses||{}).filter(v=>v==='available').length, [nextGame]);
  const playerCount = (team.members||[]).filter(m=>m.role.toLowerCase()==='player').length;
  return <main className="shell coach-shell"><section className="content coach-content">
    <header className="topbar"><Link href="/">← Ingresso</Link><span>AREA COACH</span></header>
    <p className="eyebrow">COURTLY · AREA COACH</p><h1>Buongiorno, {nickname}.</h1><p className="muted">{dataSource==='shared'?'Riepilogo sincronizzato con la squadra.':dataSource==='error'?'Dati online non disponibili.':'Riepilogo dei dati locali di questo dispositivo.'}</p>
    <div className="stats">
      <div className="stat"><small>Prossimo allenamento</small><strong>{nextTraining?formatDate(nextTraining.date):'—'}</strong><label>{nextTraining?`${nextTraining.time||'Ora da definire'} · ${nextTraining.location||'Luogo da definire'}`:'Nessun allenamento programmato'}</label></div>
      <div className="stat"><small>Risposte allenamento</small><strong>{trainingStats.present}<span>{playerCount?`/${playerCount}`:''}</span></strong><label className="orange">{trainingStats.pending} risposte mancanti</label></div>
      <div className="stat"><small>Prossima partita</small><strong>{nextGame?formatDate(nextGame.date):'—'}</strong><label>{nextGame?`vs ${nextGame.opponent} · ${gameAvailable} disponibili`:'Nessuna partita programmata'}</label></div>
    </div>
    <div className="section-heading"><h2>Azioni rapide</h2></div>
    <div className="quick-grid"><Link className="quick" href="/trainings"><span>＋</span><h3>Crea allenamento</h3><p>Programma la prossima sessione.</p></Link><Link className="quick" href="/games"><span>🏀</span><h3>Nuova partita</h3><p>Raccogli disponibilità e organizza la gara.</p></Link><Link className="quick" href="/teams"><span>♟</span><h3>Squadra e roster</h3><p>Gestisci i membri della squadra.</p></Link></div>
    <div className="section-heading"><h2>Risposte allenamento</h2><span className="pending">{!ready?'Caricamento':dataSource==='shared'?'Dati condivisi':dataSource==='error'?'Sync non riuscita':'Dati locali'}</span></div>
    {!ready?<p className="muted">Caricamento…</p>:!nextTraining?<p className="muted">Nessun allenamento prossimo. Crea una sessione per raccogliere risposte.</p>:<div className="roster">{Object.entries(nextTraining.responses||{}).map(([player,status])=><div key={player}><b>{player}</b><span className={status==='present'?'present':status==='absent'?'absent':'pending'}>{status==='present'?'Presente':status==='absent'?'Assente':'Non ha risposto'}</span></div>)}</div>}
    <p className="muted">{dataSource==='shared'?'Dati sincronizzati dal database centrale della squadra.':dataSource==='error'?'La sincronizzazione è fallita; non vengono presentati dati locali come condivisi.':'Modalità locale/demo: dati disponibili solo su questo dispositivo.'}</p>
  </section></main>;
}
