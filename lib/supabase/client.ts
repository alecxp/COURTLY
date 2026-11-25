import { createClient } from '@supabase/supabase-js';

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Accept either the Supabase project URL or a pasted REST endpoint URL.
// Supabase JS needs the project origin, not /rest/v1 or other API paths.
function normalizeSupabaseUrl(value?: string) {
  if (!value) return undefined;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
}

const url = normalizeSupabaseUrl(configuredUrl);
export const isSupabaseConfigured = Boolean(url && anonKey);
// Keep the UI renderable during local setup; auth actions should check configuration first.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
);
