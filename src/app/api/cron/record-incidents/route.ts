export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { recordTodayIncidents } from "@/lib/metrics";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = await recordTodayIncidents();
  return NextResponse.json({ ok: true, ...res }, { headers: { "Cache-Control": "no-store" } });
}
