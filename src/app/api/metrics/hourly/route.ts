export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { buildPredicate } from "@/lib/ruleEngine";

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

function hourMadrid(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(h, 10);
}

function startDateFor(range: RangeKey) {
  const now = new Date();
  if (range === "24h") return addHours(now, -24);
  if (range === "7d") return addDays(now, -7);
  return addDays(now, -30);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const binary = (searchParams.get("binary") ?? "").trim(); // "" = all
  const range = (searchParams.get("range") ?? "7d") as RangeKey;

  if (!["24h", "7d", "30d"].includes(range)) {
    return NextResponse.json({ ok: false, error: "range inválido" }, { status: 400 });
  }

  const supabase = supabaseServer();

  let compiled: ((row: any) => boolean)[] = [];

  if (binary && binary !== "__all__") {
    const { data: rules, error: rulesErr } = await supabase
      .from("rules")
      .select("rule")
      .ilike("binary", `%${binary}%`);

    if (rulesErr) {
      return NextResponse.json({ ok: false, error: rulesErr.message }, { status: 500 });
    }

    compiled = (rules ?? [])
      .map((r: any) => String(r.rule ?? "").trim())
      .filter(Boolean)
      .map((rt: string) => buildPredicate(rt));
  }

  const startDate = startDateFor(range);

  const { data: traffic, error: trafficErr } = await supabase
    .from("traffic")
    .select(`
      timestamp,
      event_id:"event.id",
      host_name:"host.name",
      host_ip:"host.ip",
      user_name:"user.name",
      process_name:"process.name",
      process_executable:"process.executable",
      process_command_line:"process.command_line",
      process_parent_name:"process.parent.name",
      process_pid:"process.pid",
      process_args:"process.args",
      agent_name:"agent.name",
      source_ip:"source.ip",
      destination_ip:"destination.ip",
      event_type:"event.type",
      user_id:"user.id"
    `)
    .gte("timestamp", startDate.toISOString());

  if (trafficErr) {
    return NextResponse.json({ ok: false, error: trafficErr.message }, { status: 500 });
  }

  const buckets = Array.from({ length: 24 }, () => 0);

  for (const row of traffic ?? []) {
    const ts = new Date((row as any).timestamp);
    const h = hourMadrid(ts);

    const obj = { ...(row as any), ts: (row as any).timestamp };

    let hits = 0;

    if (!binary || binary === "__all__") {
      // "All": count each row as 1 incident if it is an "incident" record already
      // If your traffic is raw events, you probably want: hits = 1;
      // But to keep consistent with your project, we treat "incident" as "matches any rule".
      // That requires all rules -> expensive; so we do a simple 1 per row.
      hits = 1;
    } else {
      for (const pred of compiled) {
        if (pred(obj)) hits++;
      }
    }

    if (hits > 0) buckets[h] += hits;
  }

  const points = buckets.map((incidents, hour) => ({ hour, incidents }));

  return NextResponse.json(
    { ok: true, range, binary: binary || "__all__", points },
    { headers: { "Cache-Control": "no-store" } }
  );
}
