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

export async function getUserRole(userId: string) {
  const { data, error } = await supabaseServer()
    .from("users")  // Asegúrate de tener esta tabla
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user role:", error);
    return null; // O lanza un error si lo prefieres
  }
  return data?.role;
}
