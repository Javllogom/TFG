export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

type RangeKey = "24h" | "7d" | "30d";

function addHours(d: Date, hours: number) {
  const x = new Date(d);
  x.setHours(x.getHours() + hours);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startDateFor(range: RangeKey) {
  const now = new Date();
  if (range === "24h") return addHours(now, -24);
  if (range === "7d") return addDays(now, -7);
  return addDays(now, -30);
}

function hourMadrid(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  return parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
}

function dayISOMadrid(d: Date): string {
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") ?? "7d") as RangeKey;

  if (!["24h", "7d", "30d"].includes(range)) {
    return NextResponse.json({ ok: false, error: "range inválido" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const startDate = startDateFor(range);

  const { data: traffic, error: trafficErr } = await supabase
    .from("traffic")
    .select("timestamp")
    .gte("timestamp", startDate.toISOString());

  if (trafficErr) {
    return NextResponse.json({ ok: false, error: trafficErr.message }, { status: 500 });
  }

  if (range === "24h") {
    const buckets = Array.from({ length: 24 }, () => 0);

    for (const row of traffic ?? []) {
      const ts = new Date((row as any).timestamp);
      const h = hourMadrid(ts);
      buckets[h] += 1;
    }

    const points = buckets.map((incidents, hour) => ({ key: String(hour).padStart(2, "0"), incidents }));
    return NextResponse.json({ ok: true, range, mode: "hours", points }, { headers: { "Cache-Control": "no-store" } });
  }

  // 7d / 30d -> buckets by day ISO
  const map = new Map<string, number>();
  for (const row of traffic ?? []) {
    const ts = new Date((row as any).timestamp);
    const day = dayISOMadrid(ts);
    map.set(day, (map.get(day) ?? 0) + 1);
  }

  return NextResponse.json(
    {
      ok: true,
      range,
      mode: "days",
      points: Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, incidents]) => ({ key: day, incidents })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
