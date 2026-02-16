export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET() {
  const supabase = supabaseServer();

  // Trae últimos 7 días (incluido hoy) en orden
  const { data, error } = await supabase
    .from("daily_incidents")
    .select("day, incidents")
    .order("day", { ascending: false })
    .limit(7);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const points = (data ?? [])
    .map((r) => ({ day: r.day, incidents: r.incidents }))
    .reverse();

  return NextResponse.json({ ok: true, points }, { headers: { "Cache-Control": "no-store" } });
}
