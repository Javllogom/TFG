export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

type RangeKey = "7d" | "30d";

function startDateFor(range: RangeKey) {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - (range === "7d" ? 7 : 30));
  return d;
}

function madridWeekday(d: Date): number {
  // 0=Sun ... 6=Sat
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    weekday: "short",
  }).formatToParts(d);

  const wd = (parts.find((p) => p.type === "weekday")?.value ?? "").toLowerCase();
  const map: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  return map[wd] ?? 0;
}

function madridHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  return parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") ?? "7d") as RangeKey;

  if (!["7d", "30d"].includes(range)) {
    return NextResponse.json({ ok: false, error: "range inválido" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const start = startDateFor(range);

  const { data, error } = await supabase
    .from("traffic")
    .select("timestamp")
    .gte("timestamp", start.toISOString());

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // matrix[weekday][hour] -> weekday: 1..6 + 0 last (Mon..Sat + Sun)
  const matrix: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));

  for (const row of data ?? []) {
    const ts = new Date((row as any).timestamp);
    const wd = madridWeekday(ts); // 0..6
    const h = madridHour(ts); // 0..23

    // reorder to Mon..Sun in UI (Mon=0..Sun=6)
    const uiDay = wd === 0 ? 6 : wd - 1;
    matrix[uiDay][h] += 1;
  }

  const max = matrix.reduce((acc, r) => Math.max(acc, ...r), 0);

  return NextResponse.json(
    { ok: true, range, matrix, max },
    { headers: { "Cache-Control": "no-store" } }
  );
}
