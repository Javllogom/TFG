export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { buildPredicate } from "@/lib/ruleEngine";

type RangeKey = "24h" | "7d" | "30d";

function madridDayISO(d: Date): string {
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

function madridHourKey(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const da = parts.find((p) => p.type === "day")?.value;
  const h = parts.find((p) => p.type === "hour")?.value;
  return `${y}-${m}-${da} ${h}:00`;
}

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

function buildBuckets(range: RangeKey) {
  const now = new Date();
  if (range === "24h") {
    const start = addHours(now, -23);
    const keys: string[] = [];
    for (let i = 0; i < 24; i++) keys.push(madridHourKey(addHours(start, i)));
    return { startDate: addHours(now, -24), keys, kind: "hour" as const };
  }

  const days = range === "7d" ? 7 : 30;
  const start = addDays(now, -(days - 1));
  const keys: string[] = [];
  for (let i = 0; i < days; i++) keys.push(madridDayISO(addDays(start, i)));
  return { startDate: addDays(now, -days), keys, kind: "day" as const };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const binary = (searchParams.get("binary") ?? "").trim();
  const range = (searchParams.get("range") ?? "7d") as RangeKey;

  if (!binary) {
    return NextResponse.json({ ok: false, error: "binary requerido" }, { status: 400 });
  }
  if (!["24h", "7d", "30d"].includes(range)) {
    return NextResponse.json({ ok: false, error: "range inválido" }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: rules, error: rulesErr } = await supabase
    .from("rules")
    .select("binary, rule")
    .ilike("binary", `%${binary}%`);

  if (rulesErr) {
    return NextResponse.json({ ok: false, error: rulesErr.message }, { status: 500 });
  }

  const compiled = (rules ?? [])
    .map((r: any) => String(r.rule ?? "").trim())
    .filter(Boolean)
    .map((rt: string) => buildPredicate(rt));

  const { startDate, keys, kind } = buildBuckets(range);
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

  const bucketMap = new Map<string, number>();
  keys.forEach((k) => bucketMap.set(k, 0));

  for (const row of traffic ?? []) {
    const ts = new Date((row as any).timestamp);
    const key = kind === "hour" ? madridHourKey(ts) : madridDayISO(ts);

    if (!bucketMap.has(key)) continue;

    const obj = { ...(row as any), ts: (row as any).timestamp };
    let hit = 0;
    for (const pred of compiled) {
      if (pred(obj)) hit++;
    }
    if (hit > 0) bucketMap.set(key, (bucketMap.get(key) ?? 0) + hit);
  }

  const points = keys.map((k) => ({ x: k, y: bucketMap.get(k) ?? 0 }));
  return NextResponse.json(
    { ok: true, binary, range, points },
    { headers: { "Cache-Control": "no-store" } }
  );
}
