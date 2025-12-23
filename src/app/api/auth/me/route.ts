export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";
import { hashToken } from "@/lib/auth";

export async function GET() {
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "bb_session";
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    return NextResponse.json(
      { user: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabase = supabaseServer();
  const tokenHash = hashToken(token);

  const { data: session } = await supabase
    .from("sessions")
    .select("user_id, expires_at")
    .eq("token", tokenHash)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) {
    return NextResponse.json(
      { user: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", session.user_id)
    .single();

  return NextResponse.json(
    { user: user ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
