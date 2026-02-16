export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { recordCurrentHourIncidents } from "@/lib/metrics";

const secret = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = await recordCurrentHourIncidents();
  return NextResponse.json(
    { ok: true, ...res },
    { headers: { "Cache-Control": "no-store" } }
  );
}
