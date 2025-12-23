export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";
import { hashToken } from "@/lib/auth";

export async function POST() {
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "bb_session";
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (token) {
    const supabase = supabaseServer();
    const tokenHash = hashToken(token);

    await supabase.from("sessions").delete().eq("token", tokenHash);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, "", {
    path: "/",
    expires: new Date(0),
  });

  return res;
}
