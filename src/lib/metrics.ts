import { supabaseServer } from "@/lib/supabase";
import { buildPredicate } from "@/lib/ruleEngine";

export function madridDayISO(d = new Date()): string {
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


export async function recordTodayIncidents() {
  const supabase = supabaseServer();

  const day = madridDayISO();

  // 1) load rules (all)
  const { data: rules, error: rulesErr } = await supabase
    .from("rules")
    .select("rule");

  if (rulesErr) throw new Error(rulesErr.message);

  // 2) load today's traffic (filter by timestamp day in Madrid)
  // If your `traffic.timestamp` is timestamptz, simplest is pulling the last 24h or using a range.
  // Here we use "today" in Madrid by building a UTC range around it (good enough for daily totals).
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

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
    .gte("timestamp", start.toISOString())
    .lte("timestamp", end.toISOString());

  if (trafficErr) throw new Error(trafficErr.message);

  const rows = traffic ?? [];

  // 3) compute total matches across all rules
  let incidents = 0;
  for (const r of rules ?? []) {
    const pred = buildPredicate(String((r as any).rule ?? ""));
    for (const row of rows) {
      if (pred(withDotKeys(row))) incidents++;
    }
  }


  // 4) upsert daily value (idempotent)
  const { error: upErr } = await supabase
    .from("daily_incidents")
    .upsert({ day, incidents }, { onConflict: "day" });

  if (upErr) throw new Error(upErr.message);

  return { day, incidents };
}

function withDotKeys(row: Record<string, any>) {
  const out: Record<string, any> = { ...row };

  for (const [k, v] of Object.entries(row)) {
    if (k.includes("_")) {
      out[k.replace(/_/g, ".")] = v;
    }
  }
  return out;
}

