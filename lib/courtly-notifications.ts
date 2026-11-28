export type CourtlyNotificationCategory = 'team' | 'training' | 'game' | 'convocation' | 'basket';
export type CourtlyNotification = {
  id: string;
  category: CourtlyNotificationCategory;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  href: string;
};
const STORAGE_KEY = 'courtly-notifications';

/** Adds a local prototype notification and broadcasts it to open COURTLY tabs. */
export function addCourtlyNotification(input: Omit<CourtlyNotification, 'id' | 'time' | 'unread'>) {
  if (typeof window === 'undefined') return;
  const notification: CourtlyNotification = {
    ...input,
    id: `courtly-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: 'Adesso',
    unread: true,
  };
  try {
    const existing = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as CourtlyNotification[];
    const safeExisting = Array.isArray(existing) ? existing : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([notification, ...safeExisting].slice(0, 50)));
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([notification]));
  }
  window.dispatchEvent(new CustomEvent('courtly-notification', { detail: notification }));
}

/** Best-effort delivery of a team-wide notification to each current member. */
export async function addSharedTeamNotification(input: Omit<CourtlyNotification, 'id' | 'time' | 'unread'>) {
  try {
    const { getSharedContext } = await import('./shared-events');
    const ctx = await getSharedContext();
    if (!ctx) return false;
    const { data: members, error: membersError } = await ctx.supabase
      .from('team_members').select('user_id').eq('team_id', ctx.teamId);
    if (membersError) throw membersError;
    const recipients = [...new Set((members || []).map((m: { user_id: string }) => m.user_id))];
    if (!recipients.length) return true;
    const rows = recipients.map(user_id => ({ team_id: ctx.teamId, user_id, category: input.category, title: input.title, body: input.body, href: input.href }));
    const { error } = await ctx.supabase.from('team_notifications').insert(rows);
    if (error) throw error;
    // Best-effort remote push after persistent in-app notifications succeed.
    const { data: sessionData } = await ctx.supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (token) {
      try {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: input.title, body: input.body, url: input.href, recipientIds: recipients }),
        });
      } catch { /* in-app notification remains saved even if push delivery is unavailable */ }
    }
    return true;
  } catch {
    return false;
  }
}
