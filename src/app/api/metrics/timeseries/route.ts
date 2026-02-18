export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

type RangeKey = "7d" | "30d";
type ApiPoint = { x: string; y: number };

function madridDayISO(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const da = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${da}`;
}

function lastMadridDaysISO(n: number): string[] {
  const base = new Date();
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    days.push(madridDayISO(d));
  }
  return days;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const binary = (searchParams.get("binary") ?? "").trim();
    const range = (searchParams.get("range") ?? "7d") as RangeKey;

    if (!binary) {
      return NextResponse.json(
        { ok: false, error: "Missing binary" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (range !== "7d" && range !== "30d") {
      return NextResponse.json(
        { ok: false, error: "Invalid range" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = supabaseServer();
    const days = lastMadridDaysISO(range === "7d" ? 7 : 30);
    const from = days[0];
    const to = days[days.length - 1];

    // Serie diaria por binario (la que grabas a las 3AM en daily_binary_incidents)
    const { data, error } = await supabase
      .from("daily_binary_incidents")
      .select("day, incidents")
      .eq("binario", binary)
      .gte("day", from)
      .lte("day", to)
      .order("day", { ascending: true });

    if (error) throw error;

    const map = new Map<string, number>(
      (data ?? []).map((r: any) => [String(r.day), Number(r.incidents ?? 0)])
    );

    const points: ApiPoint[] = days.map((day) => ({
      x: day,              // <-- OJO: x = YYYY-MM-DD
      y: map.get(day) ?? 0 // <-- y = incidents
    }));

    return NextResponse.json(
      { ok: true, points },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
