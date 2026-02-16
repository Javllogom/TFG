
// src/lib/metrics.ts
import { supabaseServer } from "@/lib/supabase";
import { buildPredicate } from "@/lib/ruleEngine";

type RuleRow = { binary: string; rule: string };
type TrafficRow = Record<string, unknown>;

function withDotKeys(row: Record<string, any>) {
  const out: Record<string, any> = { ...row };

  for (const [k, v] of Object.entries(row)) {
    if (k.includes("_")) {
      out[k.replace(/_/g, ".")] = v;
    }
  }
  return out;
}


async function computeBinaryCounts(): Promise<Array<{ binario: string; incidents: number }>> {
  const [rules, traffic] = await Promise.all([fetchRulesMinimal(), fetchTrafficMinimal()]);

  const bins = Array.from(new Set(rules.map((r) => String(r.binary ?? "").trim()).filter(Boolean)));

  const items = bins.map((bin) => {
    const rulesForBin = rules.filter(
      (r) => String(r.binary ?? "").trim().toLowerCase() === bin.toLowerCase()
    );

    let sum = 0;
    for (const r of rulesForBin) {
      const pred = buildPredicate(r.rule);
      sum += traffic.filter((t) => pred(t as any)).length;
    }

    return { binario: bin, incidents: sum };
  });

  return items;
}



// --- exports ---

export async function recordDailyIncidents() {
  const supabase = supabaseServer();
  const day = madridDayISO();

  const perBin = await computeBinaryCounts();
  const total = perBin.reduce((acc, x) => acc + (x.incidents ?? 0), 0);

  const { data, error } = await supabase
    .from("daily_incidents")
    .upsert({ day, incidents: total }, { onConflict: "day" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordDailyBinaryIncidents() {
  const supabase = supabaseServer();
  const day = madridDayISO();

  const perBin = await computeBinaryCounts();

  const payload = perBin.map((x) => ({
    day,
    binario: x.binario,
    incidents: x.incidents,
  }));

  const { error } = await supabase
    .from("daily_binary_incidents")
    .upsert(payload, { onConflict: "day,binario" });

  if (error) throw error;

  return { day, count: payload.length };
}

export async function recordHourlyIncidents() {
  const supabase = supabaseServer();
  const day = madridDayISO();
  const hour = madridHour();

  const perBin = await computeBinaryCounts();
  const total = perBin.reduce((acc, x) => acc + (x.incidents ?? 0), 0);

  const { data, error } = await supabase
    .from("hourly_incidents")
    .upsert({ day, hour, incidents: total }, { onConflict: "day,hour" })
    .select()
    .single();

  if (error) throw error;
  return data;
}


/** YYYY-MM-DD en Europe/Madrid */

function madridHour(d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return Math.max(0, Math.min(23, parseInt(h, 10) || 0));
}

export async function upsertHourlyIncidents(date: Date, dayISO: string, dow: number, hour: number, incidents: number) {
  const supabase = supabaseServer();

  const { error } = await supabase
    .from("hourly_incidents")
    .upsert(
      { ts_hour: date.toISOString(), day: dayISO, dow, hour, incidents, created_at: new Date().toISOString() },
      { onConflict: "day,hour" }
    );

  if (error) throw error;
}



export function madridDayISO(d = new Date()): string {
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

// ✅ MISMA selección mínima que estás usando en Home/Stats
async function fetchRulesMinimal(): Promise<RuleRow[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("rules").select("binary, rule");
  if (error) throw error;
  return (data ?? []) as RuleRow[];
}

async function fetchTrafficMinimal(): Promise<TrafficRow[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase.from("traffic").select(`
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
  `);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    ...r,
    ts: r.timestamp, // para ruleEngine
  })) as TrafficRow[];
}

async function getBinariesAndCountsCurrent() {
  const [rules, traffic] = await Promise.all([fetchRulesMinimal(), fetchTrafficMinimal()]);

  const bins = Array.from(
    new Set(rules.map((r) => String(r.binary ?? "").trim()).filter(Boolean))
  );

  const items = bins.map((bin) => {
    const rulesForBin = rules.filter(
      (r) => String(r.binary ?? "").trim().toLowerCase() === bin.toLowerCase()
    );

    let sum = 0;
    for (const r of rulesForBin) {
      const pred = buildPredicate(r.rule);
      sum += traffic.filter((t) => pred(t as any)).length;
    }

    return { name: bin, count: sum };
  });

  items.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  return items;
}

async function upsertDailyIncidents(dayISO: string, incidents: number) {
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("daily_incidents")
    .upsert({ day: dayISO, incidents }, { onConflict: "day" });

  if (error) throw new Error(error.message);
}

async function upsertDailyBinaryIncidents(
  dayISO: string,
  perBinary: { binario: string; incidents: number }[]
) {
  const supabase = supabaseServer();

  if (perBinary.length === 0) return;

  const rows = perBinary.map((b) => ({
    day: dayISO,
    binario: b.binario,
    incidents: b.incidents,
  }));

  const { error } = await supabase
    .from("daily_binary_incidents")
    .upsert(rows, { onConflict: "day,binario" });

  if (error) throw new Error(error.message);
}

// ✅ ESTA ES LA FUNCIÓN QUE LLAMA TU CRON ROUTE
export async function recordTodayIncidents() {
  const day = madridDayISO(new Date());

  // 1) Sacamos los numeritos de los badges (igual que Home)
  const binItems = await getBinariesAndCountsCurrent();

  // 2) Total global (igual que Home)
  const totalIncidents = binItems.reduce((acc, b) => acc + (b.count ?? 0), 0);

  // 3) Per-binario
  const perBinary = binItems.map((b) => ({
    binario: b.name,
    incidents: b.count ?? 0,
  }));

  // 4) Persistimos
  await upsertDailyIncidents(day, totalIncidents);
  await upsertDailyBinaryIncidents(day, perBinary);

  return { day, incidents: totalIncidents, bins: perBinary.length };
}

// ✅ Graba incidencias del "heatmap" cada hora en punto (hora Madrid)
export async function recordCurrentHourIncidents() {
  const date = new Date();
  const day = madridDayISO(date);
  const hour = madridHour(date); // 0..23 en Europe/Madrid
  // Igual que Home: numeritos por binario
  const binItems = await getBinariesAndCountsCurrent();
  // Total global
  const totalIncidents = binItems.reduce((acc, b) => acc + (b.count ?? 0), 0);
  // Persistimos UNA celda (day,hour) para el heatmap
  const dow = new Date().getDay(); // 0..6 dom..sáb (para no grabar nada el domingo, por ejemplo)
  await upsertHourlyIncidents(date, day, dow, hour, totalIncidents);

  return { day, hour, incidents: totalIncidents };
}
