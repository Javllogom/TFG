export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("daily_incidents")
    .select("day, incidents")
    .order("day", { ascending: false })
    .limit(7);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, points: (data ?? []).reverse() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
