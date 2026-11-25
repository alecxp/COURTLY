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
        const { data: currentSession } = await supabase.auth.getSession();
        const accessToken = currentSession.session?.access_token;
        if (!accessToken) throw new Error('Sessione non disponibile.');
        const entryResponse = await fetch('/api/team-entry', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken }, body: JSON.stringify({ nickname: clean, teamName: teamName.trim(), role }) });
        const entryData = await entryResponse.json();
        if (!entryResponse.ok) throw new Error(entryData.error || 'Associazione alla squadra non riuscita.');
        effectiveRole = entryData.role;
        localStorage.setItem('courtly_shared_team_id', entryData.teamId);