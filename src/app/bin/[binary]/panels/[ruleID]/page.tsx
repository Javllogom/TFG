// src/app/bin/[binary]/panels/[ruleId]/page.tsx
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { getAppSession } from "@/lib/protectedRoute";
import PanelDetailView from "@/components/PanelDetailView";
import { buildPredicate } from "@/lib/ruleEngine";

type Params = { binary: string; ruleId: string };
type TrafficRow = Record<string, unknown>;

function toColumns(c: unknown): string[] {
  if (Array.isArray(c)) return c.map(String);
  if (typeof c === "string") {
    try {
      const p = JSON.parse(c);
      if (Array.isArray(p)) return p.map(String);
    } catch {}
    return c.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

async function fetchRule(binary: string, ruleId: string) {
  const supabase = supabaseServer();

  // Ajusta el nombre de tabla/campos a lo que tengas: rules, rule_settings, etc.
  const { data, error } = await supabase
    .from("rules")
    .select("id, binary, title, rule, description, link, columns")
    .eq("id", ruleId)
    .eq("binary", binary)
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    columns: toColumns(data.columns),
  };
}

async function fetchTrafficMinimal(): Promise<TrafficRow[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from("traffic").select(`
    timestamp,
    host_name:"host.name",
    user_name:"user.name",
    process_executable:"process.executable",
    process_command_line:"process.command_line",
    process_parent_name:"process.parent.name",
    process_name:"process.name",
    host_ip:"host.ip",
    source_ip:"source.ip",
    destination_ip:"destination.ip",
    event_type:"event.type"
  `);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ ...r, ts: r.timestamp })) as TrafficRow[];
}

export default async function BinPanelDetailPage({ params }: { params: Params }) {
  const user = await getAppSession();
  if (!user) redirect("/login");

  const binary = decodeURIComponent(params.binary);
  const ruleId = params.ruleId;

  const [ruleRow, traffic] = await Promise.all([
    fetchRule(binary, ruleId),
    fetchTrafficMinimal(),
  ]);

  const pred = buildPredicate(ruleRow.rule);
  const rows = (traffic ?? []).filter((t) => pred(t as any)) as Array<Record<string, any>>;

  return (
    <PanelDetailView
      backHref={`/bin/${encodeURIComponent(binary)}`}
      title={ruleRow.title}
      description={ruleRow.description ?? ""}
      link={ruleRow.link ?? ""}
      incidentsCount={rows.length}
      columns={ruleRow.columns}
      rows={rows}
    />
  );
}
