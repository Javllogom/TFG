export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

type RangeKey = "7d" | "30d";

function madridDayISO(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const da = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${da}`;
}

function subMadridDaysISO(n: number): string[] {
  const base = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(madridDayISO(d));
  }
  return out;
}

// 0=Lun ... 6=Dom (para tu UI)
function dayOfWeekIndexMadrid(dayISO: string): number {
  const d = new Date(`${dayISO}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    weekday: "short",
  }).format(d);
  // en-US: Mon,Tue,Wed,Thu,Fri,Sat,Sun
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[wd] ?? 0;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") ?? "7d") as RangeKey;
  const daysCount = range === "30d" ? 30 : 7;

  const days = subMadridDaysISO(daysCount);

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("hourly_incidents")
    .select("day, hour, incidents")
    .in("day", days);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));

  for (const r of data ?? []) {
    const dayIdx = dayOfWeekIndexMadrid(r.day);
    const hour = Number(r.hour);
    if (hour >= 0 && hour <= 23) {
      matrix[dayIdx][hour] += Number(r.incidents) || 0; // suma por si hay varias semanas/mes
    }
  }

  let max = 0;
  for (const row of matrix) for (const v of row) max = Math.max(max, v);

  return NextResponse.json({ ok: true, range, matrix, max }, { headers: { "Cache-Control": "no-store" } });
}
