// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function supabaseServer() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  _supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'x-client-info': 'binboard-server' } },
  });
  return _supabase!;
}
