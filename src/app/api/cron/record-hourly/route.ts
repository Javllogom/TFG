export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { recordCurrentHourIncidents, recordTodayIncidents } from "@/lib/metrics";

function madridHour(d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return Math.max(0, Math.min(23, parseInt(h, 10) || 0));
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 1) Siempre: heatmap/hourly
  const hourly = await recordCurrentHourIncidents();

  // 2) Solo a las 03:00 Madrid: daily snapshots
  let daily: any = null;
  if (madridHour(new Date()) === 3) {
    daily = await recordTodayIncidents();
  }

  return NextResponse.json(
    { ok: true, hourly, daily },
    { headers: { "Cache-Control": "no-store" } }
  );
}