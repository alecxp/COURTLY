'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSharedContext, loadSharedEvents } from '../../lib/shared-events';
type Player = { id: string; nickname: string };
type Training = { id: string; date: string; responses: Record<string, string> };
export default function PrimePiumePage() {
 const [players,setPlayers]=useState<Player[]>([]);
 const [trainings,setTrainings]=useState<Training[]>([]);
 const [nickname,setNickname]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;
  async function load(){
   try{
    const nick=localStorage.getItem('courtly_demo_nickname')||'';
    if(active)setNickname(nick);
    const ctx=await getSharedContext();
    if(!ctx)throw new Error('Accedi alla squadra per visualizzare le statistiche.');
    const [memberResult,eventResult]=await Promise.all([
     ctx.supabase.from('team_members').select('user_id,profiles(nickname)').eq('team_id',ctx.teamId).eq('is_first_year',true),
     loadSharedEvents(ctx.supabase,ctx.teamId,'training')
    ]);
    if(memberResult.error)throw memberResult.error;
    const members=memberResult.data||[];
    const ids=members.map((m:any)=>m.user_id);
    const names=new Map<string,string>(members.map((m:any)=>[m.user_id,m.profiles?.nickname||'Giocatore']));
    const past=eventResult.filter((e:any)=>new Date(e.starts_at).getTime()<Date.now());
    const responses=past.length?await ctx.supabase.from('event_responses').select('event_id,player_id,response').in('event_id',past.map((e:any)=>e.id)).in('player_id',ids):{data:[],error:null};
    if(responses.error)throw responses.error;
    const byPlayer:Record<string,Record<string,string>>={};
    (responses.data||[]).forEach((r:any)=>{const n=names.get(r.player_id);if(n){byPlayer[n] ||= {};byPlayer[n][r.event_id]=r.response;}});
    const mapped:Training[]=past.map((e:any)=>({id:e.id,date:e.starts_at,responses:Object.fromEntries(ids.map(id=>[names.get(id)||'',(byPlayer[names.get(id)||'']||{})[e.id]||'pending']))}));
    if(active){setPlayers(ids.map(id=>({id,nickname:names.get(id)||'Giocatore'})));setTrainings(mapped);}
   }catch(err){if(active)setError(err instanceof Error?err.message:'Errore caricamento dati');}
   finally{if(active)setLoading(false);}
  }
  load();return()=>{active=false};
 },[]);
 const stats=useMemo(()=>players.map(p=>{
  let present=0,absent=0,pending=0,streak=0;
  const ordered=[...trainings].sort((a,b)=>a.date.localeCompare(b.date));
  for(const t of ordered){const s=t.responses[p.nickname];if(s==='present')present++;else if(s==='absent')absent++;else pending++;}
  for(let i=ordered.length-1;i>=0;i--){if(ordered[i].responses[p.nickname]==='present')streak++;else break;}
  return {...p,present,absent,pending,rate:ordered.length?Math.round(present/ordered.length*100):0,streak};
 }).sort((a,b)=>b.present-a.present||b.rate-a.rate),[players,trainings]);
 const me=stats.find(p=>p.nickname.toLowerCase()===nickname.toLowerCase());
 return (
  <main className="shell coach-shell">
   <section className="content statistics-content">
    <header className="topbar"><Link href="/dashboard">← Dashboard</Link><span>COURTLY · LE PRIME PIUME</span></header>
    <div className="statistics-hero"><div><p className="eyebrow">PEACOX BASKET · PERCORSO ESORDIENTI</p><h1>Le Prime Piume 🪶</h1><p className="muted">Il primo anno. Il primo spogliatoio. Ogni presenza conta.</p></div><div className="statistics-icon">🏀</div></div>
    {loading?<p className="muted">Caricamento…</p>:error?<div className="statistics-empty"><p>{error}</p></div>:(
     <>
      <div className="stats-grid">
       <article className="stat-card"><small>Prime Piume</small><strong>{players.length}</strong><span>giocatori del gruppo</span></article>
       <article className="stat-card"><small>Allenamenti analizzati</small><strong>{trainings.length}</strong><span>storico condiviso</span></article>
       <article className="stat-card"><small>Presenze totali</small><strong>{stats.reduce((s,p)=>s+p.present,0)}</strong><span>del gruppo</span></article>
       <article className="stat-card"><small>Presenza media</small><strong>{stats.length?Math.round(stats.reduce((s,p)=>s+p.rate,0)/stats.length):0}%</strong><span>gruppo</span></article>
      </div>
      <section className="statistics-panel"><div className="section-heading"><h2>Classifica presenze</h2><span className="pending">{stats.length} giocatori</span></div>
       {stats.length===0?<div className="statistics-empty"><h3>Il gruppo è pronto a crescere</h3><p>Il coach può aggiungere giocatori alle Prime Piume dal roster.</p></div>:(
        <div className="statistics-history">{stats.map((p,i)=>(
         <div className="history-row" key={p.id}><div className="history-date">#{i+1}</div><div className="history-title"><b>{p.nickname}</b><small>{p.present} presenze · {p.absent} assenze · {p.pending} senza risposta</small></div><div className="history-status"><strong>{p.rate}%</strong><small>{p.streak} 🔥</small></div></div>
        ))}</div>
       )}
      </section>
      {me&&<section className="statistics-panel"><h2>Il tuo percorso</h2><div className="stats-grid"><article className="stat-card"><small>Presenze</small><strong>{me.present}</strong></article><article className="stat-card"><small>Percentuale</small><strong>{me.rate}%</strong></article><article className="stat-card"><small>Consecutive</small><strong>{me.streak} 🔥</strong></article><article className="stat-card"><small>Assenze</small><strong>{me.absent}</strong></article></div></section>}
     </>
    )}
   </section>
  </main>
 );
}
