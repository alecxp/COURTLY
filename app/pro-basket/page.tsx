'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

type League = 'maschile' | 'femminile';
type Game = { id:string; league:League; date:string; day:string; time:string; home:string; away:string; venue:string; round:string };
// Demo fixtures only: replace with an official schedule feed/API before launch.
const games:Game[] = [
 {id:'m1',league:'maschile',date:'2026-11-22',day:'DOM 22 NOV',time:'18:00',home:'Virtus Bologna',away:'Olimpia Milano',venue:'Virtus Arena',round:'Giornata 9'},
 {id:'m2',league:'maschile',date:'2026-11-23',day:'LUN 23 NOV',time:'20:00',home:'Derthona',away:'Reyer Venezia',venue:'PalaFerraris',round:'Giornata 9'},
 {id:'m3',league:'maschile',date:'2026-11-29',day:'DOM 29 NOV',time:'17:30',home:'Brescia',away:'Trento',venue:'PalaLeonessa',round:'Giornata 10'},
 {id:'f1',league:'femminile',date:'2026-11-22',day:'DOM 22 NOV',time:'18:00',home:'Famila Schio',away:'Virtus Bologna',venue:'Palasport Livio Romare',round:'Giornata 8'},
 {id:'f2',league:'femminile',date:'2026-11-23',day:'LUN 23 NOV',time:'19:00',home:'Reyer Venezia',away:'Geas',venue:'Palasport Taliercio',round:'Giornata 8'},
 {id:'f3',league:'femminile',date:'2026-11-29',day:'DOM 29 NOV',time:'17:00',home:'Battipaglia',away:'Ragusa',venue:'PalaZauli',round:'Giornata 9'},
];
export default function ProBasketPage(){
 const [filter,setFilter]=useState<'tutte'|League>('tutte');
 const [favorites,setFavorites]=useState<string[]>([]);
 const [onlyFavorites,setOnlyFavorites]=useState(false);
 const shown=useMemo(()=>games.filter(g=>(filter==='tutte'||g.league===filter)&&(!onlyFavorites||favorites.includes(g.id))),[filter,onlyFavorites,favorites]);
 const toggleFav=(id:string)=>setFavorites(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
 return <main className="shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">C</span> COURTLY</div><div className="team-switch">U18 · Stagione 2026/27</div><nav><Link href="/">◈ Panoramica</Link><Link href="/trainings">▣ Allenamenti</Link><Link href="/teams">♟ Squadra & membri</Link><Link href="/coach">◉ Area coach</Link><Link href="/pro-basket" className="active">🏀 Pro Basket</Link><Link href="/calendar">▦ Calendario</Link><Link href="/notifications">♧ Notifiche</Link></nav><div className="profile"><div className="avatar">LM</div><div><b>Leo M.</b><small>Giocatore</small></div></div></aside>
 <section className="content pro-content"><header className="topbar"><span>COURTLY / Pro Basket</span><span className="notification">🏀 <b>{favorites.length}</b></span></header>
 <div className="pro-hero"><div><p className="eyebrow">IL BASKET NON SI FERMA</p><h1>Pro Basket <span>🏀</span></h1><p>Le prossime sfide della Serie A maschile e femminile. Scegli una partita, segnala quelle che vuoi seguire e non perderti il match.</p><div className="pro-hero-pills"><span>🇮🇹 Serie A Maschile</span><span>🏀 Serie A1 Femminile</span></div></div><div className="pro-ball">🏀</div></div>
 <div className="pro-tools"><div className="pro-tabs"><button className={filter==='tutte'?'selected':''} onClick={()=>setFilter('tutte')}>Tutte</button><button className={filter==='maschile'?'selected':''} onClick={()=>setFilter('maschile')}>Serie A Maschile</button><button className={filter==='femminile'?'selected':''} onClick={()=>setFilter('femminile')}>Serie A1 Femminile</button></div><button className={`fav-filter ${onlyFavorites?'on':''}`} onClick={()=>setOnlyFavorites(v=>!v)}>★ Le mie partite {favorites.length}</button></div>
 <div className="pro-section-title"><div><h2>Prossime partite</h2><p>Segui il calendario e salva i match che ti interessano.</p></div><span className="demo-label">CALENDARIO DEMO</span></div>
 <div className="pro-game-list">{shown.map(game=><article className="pro-game" key={game.id}><div className="pro-game-date"><strong>{game.day.split(' ')[1]}</strong><span>{game.day.split(' ').slice(0,1).join('')}</span><small>{game.day.split(' ').slice(2).join(' ')}</small></div><div className="pro-game-main"><div className="pro-game-meta"><span>{game.league==='maschile'?'SERIE A MASCHILE':'SERIE A1 FEMMINILE'}</span><span>{game.round}</span></div><div className="pro-matchup"><div className="pro-team"><span className="team-placeholder">🏀</span><b>{game.home}</b></div><div className="pro-vs"><strong>VS</strong><small>{game.time}</small></div><div className="pro-team"><span className="team-placeholder">🏀</span><b>{game.away}</b></div></div><p className="pro-venue">⌖ {game.venue}</p></div><button className={`pro-star ${favorites.includes(game.id)?'saved':''}`} onClick={()=>toggleFav(game.id)} aria-label={favorites.includes(game.id)?'Rimuovi dai preferiti':'Salva partita'}>{favorites.includes(game.id)?'★':'☆'}<small>{favorites.includes(game.id)?'Salvata':'Segui'}</small></button></article>)}</div>
 {shown.length===0&&<div className="pro-empty"><div>⭐</div><h3>Nessuna partita in questa selezione</h3><p>Prova a cambiare filtro o salva qualche partita da seguire.</p></div>}
 <div className="pro-info-note"><b>Un posto per gli appassionati.</b><p>In futuro potrai aggiungere una partita al tuo calendario personale, vedere dove guardarla e ricevere un promemoria prima della palla a due.</p></div><footer>COURTLY <span>PLAY TOGETHER.</span></footer></section></main>
}
