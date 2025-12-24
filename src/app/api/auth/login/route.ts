export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { verifyPassword, newSessionToken, hashToken } from "@/lib/auth";
import { cookies } from "next/headers";

function cookieDays() {
  const n = Number(process.env.AUTH_COOKIE_DAYS ?? "7");
  return Number.isFinite(n) && n > 0 ? n : 7;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, username, role, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Error buscando usuario." }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const ok = verifyPassword(password, String((user as any).password_hash ?? ""));
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = newSessionToken();
  const tokenHash = hashToken(token);

  const expires = new Date(Date.now() + cookieDays() * 24 * 60 * 60 * 1000);

  const { error: sErr } = await supabase.from("sessions").insert([
    {
      token: tokenHash,
      user_id: user.id,
      expires_at: expires.toISOString(),
    },
  ]);

  if (sErr) {
    return NextResponse.json({ error: "No se pudo crear sesión." }, { status: 500 });
  }

  const name = process.env.AUTH_COOKIE_NAME ?? "bb_session";

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, username: (user as any).username, role: user.role },
  });


  res.cookies.set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });

  return res;
}
