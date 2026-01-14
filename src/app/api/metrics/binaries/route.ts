export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET() {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("rules")
    .select("binary")
    .order("binary", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const bins = Array.from(
    new Set((data ?? []).map((r: any) => String(r.binary ?? "").trim()).filter(Boolean))
  );

  return NextResponse.json({ ok: true, bins }, { headers: { "Cache-Control": "no-store" } });
}
