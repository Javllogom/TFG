// src/app/api/metrics/weekly/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

type Point = { day: string; incidents: number };

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

function last7MadridDaysISO(): string[] {
  const base = new Date();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    days.push(madridDayISO(d));
  }
  return days;
}

export async function GET() {
  try {
    const supabase = supabaseServer();
    const days = last7MadridDaysISO();
    const from = days[0];
    const to = days[days.length - 1];

    const { data, error } = await supabase
      .from("daily_incidents")
      .select("day, incidents")
      .gte("day", from)
      .lte("day", to)
      .order("day", { ascending: true });

    if (error) throw error;

    const map = new Map<string, number>(
      (data ?? []).map((r: any) => [String(r.day), Number(r.incidents ?? 0)])
    );

    const points: Point[] = days.map((day) => ({
      day,
      incidents: map.get(day) ?? 0,
    }));

    return NextResponse.json({ ok: true, points }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
