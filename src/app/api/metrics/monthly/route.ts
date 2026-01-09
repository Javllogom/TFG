export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month")); // 1-12

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ ok: false, error: "Invalid year/month" }, { status: 400 });
  }

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const toDate = new Date(Date.UTC(year, month, 0)); // last day of month
  const to = `${year}-${String(month).padStart(2, "0")}-${String(toDate.getUTCDate()).padStart(2, "0")}`;

  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("daily_incidents")
    .select("day, incidents")
    .gte("day", from)
    .lte("day", to)
    .order("day", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, points: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
