export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son obligatorios." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Check if email already exists
    const { data: existing, error: existingErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: "Error comprobando usuario." }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: "Ese email ya está registrado." }, { status: 409 });
    }

    const password_hash = hashPassword(password);

    const { data: inserted, error: insertErr } = await supabase
      .from("users")
      .insert([{ email, password_hash, role: "user" }])
      .select("id, email, role")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: "No se pudo registrar el usuario." }, { status: 500 });
    }

    return NextResponse.json({ user: inserted }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
