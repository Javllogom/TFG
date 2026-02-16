export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

type RangeKey = "24h" | "7d" | "30d";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const binary = searchParams.get("binary") ?? "";
  const range = (searchParams.get("range") ?? "7d") as RangeKey;

  if (!binary) return NextResponse.json({ ok: false, error: "binary requerido" }, { status: 400 });

  const supabase = supabaseServer();

  // ✅ Para 7d/30d: tiramos de daily_binary_incidents
  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30;

    const { data, error } = await supabase
      .from("daily_binary_incidents")
      .select("day, incidents")
      .eq("binario", binary)
      .order("day", { ascending: false })
      .limit(days);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const points = (data ?? [])
      .map((r) => ({ x: r.day, y: r.incidents }))
      .reverse();

    return NextResponse.json({ ok: true, points }, { headers: { "Cache-Control": "no-store" } });
  }

  // ✅ 24h: si aún NO tienes tabla por hora y binario, devuelve vacío o usa total hourly (opcional)
  return NextResponse.json({ ok: true, points: [] }, { headers: { "Cache-Control": "no-store" } });
}
