import type { SupabaseClient } from '@supabase/supabase-js';

export type SharedEventRow = {
  id: string;
  team_id: string;
  event_type: 'training' | 'game' | 'club_event';
  title: string;
  opponent: string | null;
  starts_at: string;
  meeting_at: string | null;
  venue: string | null;
  is_home: boolean | null;
  notes: string | null;
  response_deadline: string | null;
};

export async function getSharedContext() {
  const { isSupabaseConfigured } = await import('./supabase/client');
  if (!isSupabaseConfigured) return null;
  const teamId = typeof window !== 'undefined' ? localStorage.getItem('courtly_shared_team_id') : null;
  if (!teamId) return null;
  const { supabase } = await import('./supabase/client');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  return { teamId, userId: userData.user.id, supabase };
}

export function toLocalDateTime(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function splitLocalDateTime(iso: string) {
  const local = toLocalDateTime(iso);
  return local ? { date: local.slice(0, 10), time: local.slice(11, 16) } : { date: '', time: '' };
}
export function eventDateTime(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}
export async function loadSharedEvents(client: SupabaseClient, teamId: string, eventType: SharedEventRow['event_type']) {
  const { data, error } = await client.from('events').select('*').eq('team_id', teamId).eq('event_type', eventType).order('starts_at', { ascending: true });
  if (error) throw error;
  return (data || []) as SharedEventRow[];
}
