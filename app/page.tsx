'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export default function LockerEntrance() {
  const [role, setRole] = useState<'player'|'coach'>('player');
  const [nickname, setNickname] = useState('');
  const [teamName, setTeamName] = useState('PEACOX BASKET');
  const [coachCode, setCoachCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const enter = async () => {
    const clean = nickname.trim();
    if (clean.length < 3) { setError('Il nickname deve contenere almeno 3 caratteri.'); return; }
    if (teamName.trim().toUpperCase() !== 'PEACOX BASKET') { setError('Accesso riservato ai membri PEACOX BASKET.'); return; }
    
    setBusy(true); setError('');
    try {
      const accessResponse = await fetch('/api/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, code: role === 'coach' ? coachCode : accessCode }) });
      if (!accessResponse.ok) throw new Error(accessResponse.status === 429 ? 'Troppi tentativi. Riprova tra poco.' : role === 'coach' ? 'Codice coach non corretto.' : 'Codice di accesso non corretto.');
      let effectiveRole: 'player' | 'coach' = role === 'coach' ? 'coach' : 'player';
      if (isSupabaseConfigured) {
        const { data: sessionResult, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        let userId = sessionResult.session?.user?.id;
        if (!userId) {
          const { data: authResult, error: authError } = await supabase.auth.signInAnonymously({ options: { data: { nickname: clean, requested_role: role } } });
          if (authError) throw authError;
          userId = authResult.user?.id;
        }
        if (!userId) throw new Error('Non siamo riusciti a creare la sessione.');
        const { error: profileError } = await supabase.from('profiles').upsert({ id: userId, nickname: clean }, { onConflict: 'id' });
        if (profileError) throw profileError;
        if (role === 'coach') {
          const { data: coachAccess, error: coachAccessError } = await supabase.rpc('enter_coach_mode', { p_code: coachCode });
          if (coachAccessError) throw coachAccessError;
          if (coachAccess !== true) throw new Error('Codice coach non corretto.');
          effectiveRole = 'coach';
        } else {
          const { data: playerAccess, error: playerAccessError } = await supabase.rpc('enter_player_mode');
          if (playerAccessError) throw playerAccessError;
          if (playerAccess !== true) throw new Error('Accesso giocatore non riuscito.');
          effectiveRole = 'player';
        }
        // Create/join the central team membership. The same normalized team name
        // resolves to the shared Supabase team, not a browser-local copy.
        const { data: sharedTeamId, error: teamEntryError } = await supabase.rpc('enter_team_by_name', {
          p_team_name: teamName.trim(), p_role: effectiveRole
        });
        if (teamEntryError) throw teamEntryError;
        if (typeof sharedTeamId !== 'string' || !sharedTeamId) throw new Error('Non siamo riusciti ad associare la squadra condivisa.');
        localStorage.setItem('courtly_shared_team_id', sharedTeamId);
      }
      localStorage.setItem('courtly_demo_nickname', clean);
      localStorage.setItem('courtly_demo_team_name', teamName.trim());
      localStorage.setItem('courtly_demo_role', effectiveRole);
      if (effectiveRole === 'coach') localStorage.setItem('courtly_demo_coach_code_used', 'true');
      router.push(effectiveRole === 'coach' ? '/coach' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso non riuscito.');
    } finally { setBusy(false); }
  };
  return <main className="locker-page">
    <div className="locker-orb orb-one"/><div className="locker-orb orb-two"/>
    <section className="locker-card">
      <div className="locker-brand"><span className="locker-mark">C</span><span>COURTLY</span></div>
      <p className="locker-kicker">YOUR TEAM. YOUR GAME.</p>
      <div className="locker-scene"><div className="locker-light"/><div className="locker-row">
        {['01','02','03','04','05'].map((n,i)=><div className={`locker ${i===2?'locker-open':''}`} key={n}><span>{n}</span>{i===2&&<div className="locker-jersey">🏀<small>YOUR<br/>SPOT</small></div>}</div>)}
      </div><div className="locker-bench"/><div className="locker-ball">🏀</div></div>
      <div className="locker-copy"><h1>Il tuo spogliatoio<br/><em>ti aspetta.</em></h1><p>La squadra, la stagione, ogni momento.<br/>Tutto comincia da qui.</p></div>
      <div className="locker-role-tabs"><button className={role==='player'?'chosen':''} onClick={()=>{setRole('player');setError('')}}>Sono un giocatore</button><button className={role==='coach'?'chosen':''} onClick={()=>{setRole('coach');setError('')}}>Sono un coach</button></div>
      <label className="locker-input-label">{role==='player'?'Scegli il tuo nickname':'Nickname coach'}</label>
      <input className="locker-input" value={nickname} onChange={e=>{setNickname(e.target.value);setError('')}} placeholder={role==='player'?'Es. Ace23':'Es. CoachAndrea'} maxLength={20} onKeyDown={e=>e.key==='Enter'&&enter()}/>
      {role==='coach'&&<><label className="locker-input-label">Codice coach</label><input className="locker-input" value={coachCode} onChange={e=>{setCoachCode(e.target.value);setError('')}} placeholder="Inserisci il codice" type="password" maxLength={4} inputMode="numeric" onKeyDown={e=>e.key==='Enter'&&enter()}/></> }
      {role==='player'&&<><label className="locker-input-label">Codice di accesso squadra</label><input className="locker-input" value={accessCode} onChange={e=>{setAccessCode(e.target.value);setError('')}} placeholder="Codice di accesso" type="password" inputMode="numeric" maxLength={12} onKeyDown={e=>e.key==='Enter'&&enter()}/></> }
      <label className="locker-input-label">La tua squadra</label>
      <input className="locker-input" value="PEACOX BASKET" readOnly aria-label="Squadra autorizzata"/>
      {error&&<p className="locker-error">{error}</p>}
      <button className="locker-enter" onClick={enter} disabled={busy}>{busy ? 'ENTRO…' : 'ENTRA IN SPOGLIATOIO'} <span>↗</span></button>
      <p className="locker-footnote">Accesso riservato esclusivamente ai membri PEACOX BASKET.</p>
      {role==='coach'&&<p className="locker-footnote">Codice coach: 1921</p>}
    </section>
    <footer className="locker-footer">COURTLY <span>PLAY TOGETHER.</span></footer>
  </main>;
}
