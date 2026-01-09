export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/protectedRoute";
import { madridDayISO } from "@/lib/metrics";

export async function POST(req: Request) {
  // 🔒 solo admin
  await requireAdmin();

  const body = await req.json().catch(() => null);
  const incidents = Number(body?.incidents);

  if (!Number.isFinite(incidents) || incidents < 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid incidents number" },
      { status: 400 }
    );
  }

  const day = madridDayISO();
  const supabase = supabaseServer();

  const { error } = await supabase
    .from("daily_incidents")
    .upsert(
      { day, incidents },
      { onConflict: "day" } // si ya existe el día, lo sobrescribe
    );

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, day, incidents });
}
