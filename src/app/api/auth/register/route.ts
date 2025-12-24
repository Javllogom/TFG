export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { hashPassword, newSessionToken, hashToken } from "@/lib/auth";

function cookieDays() {
  const n = Number(process.env.AUTH_COOKIE_DAYS ?? "7");
  return Number.isFinite(n) && n > 0 ? n : 7;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(u: string) {
  // letters, numbers, underscore, dot; 3-20
  return /^[a-zA-Z0-9._]{3,20}$/.test(u);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const username = String(body?.username ?? "").trim();

  if (!email || !password || !username) {
    return NextResponse.json(
      { error: "Email, contraseña y nombre de usuario son obligatorios." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Username inválido (3-20, letras/números/._)." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  const { data: existingEmail } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingEmail) {
    return NextResponse.json({ error: "Ese email ya está registrado." }, { status: 409 });
  }

  const { data: existingUsername } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUsername) {
    return NextResponse.json({ error: "Ese username ya existe." }, { status: 409 });
  }

  const password_hash = hashPassword(password);

  const { data: user, error: insertErr } = await supabase
    .from("users")
    .insert([{ email, username, password_hash, role: "user" }])
    .select("id, email, username, role")
    .single();

  if (insertErr || !user) {
    return NextResponse.json({ error: "No se pudo registrar el usuario." }, { status: 500 });
  }

  // auto-login (create session + cookie)
  const token = newSessionToken();
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + cookieDays() * 24 * 60 * 60 * 1000);

  const { error: sessErr } = await supabase.from("sessions").insert([{
    token: tokenHash,
    user_id: user.id,
    expires_at: expires.toISOString(),
  }]);

  if (sessErr) {
    return NextResponse.json({ error: "Usuario creado, pero no se pudo iniciar sesión." }, { status: 500 });
  }

  const cookieName = process.env.AUTH_COOKIE_NAME ?? "bb_session";
  const res = NextResponse.json({ user }, { status: 201 });

  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });

  return res;
}
