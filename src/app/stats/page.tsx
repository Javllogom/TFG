export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/protectedRoute";
import ChartStats from "@/components/ChartStats";
import DonutIncidents from "@/components/DonutIncidents";
import { supabaseServer } from "@/lib/supabase";
import { buildPredicate } from "@/lib/ruleEngine";
import HourlyIncidents from "@/components/HourlyIncidents";
import HeatmapWeekHour from "@/components/HeatmapWeekHour";
import BinaryTrend from "@/components/BinaryTrend";


type RuleRow = {
  binary: string;
  rule: string;
};

type TrafficRow = Record<string, unknown>;

async function fetchRulesMinimal(): Promise<RuleRow[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("rules").select("binary, rule");
  if (error) throw error;
  return (data ?? []) as RuleRow[];
}

async function fetchTrafficMinimal(): Promise<TrafficRow[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
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
    `);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    ...r,
    ts: r.timestamp, // para ruleEngine
  })) as TrafficRow[];
}


async function getBinariesAndCounts() {
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

    return { name: bin, count: sum };
  });

  items.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  return items;
}

export default async function StatsPage() {
  const user = await getAppSession();
  if (!user) redirect("/login");

  const binCounts = await getBinariesAndCounts();

  return (
    <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <ChartStats />
        <DonutIncidents items={binCounts} />
        <BinaryTrend />
        <HeatmapWeekHour />
      </div>
    </main>
  );
}
