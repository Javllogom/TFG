export const runtime = "nodejs";

import { supabaseServer } from "@/lib/supabase";
import BinRulesClient from "./BinRulesClient";
import BinFooter from "./BinFooter";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/protectedRoute";

type RuleRow = {
  id?: string;
  binary: string;
  title: string;
  rule: string;
  description: string;
  link: string;
  columns: string[];
};

type TrafficRow = Record<string, unknown>;

function toColumns(c: unknown): string[] {
  if (Array.isArray(c)) return c as string[];
  if (typeof c === "string") {
    try {
      const p = JSON.parse(c);
      if (Array.isArray(p)) return p.map(String);
    } catch {}
    return c
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

async function fetchRulesFor(binary: string): Promise<RuleRow[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("rules")
    .select("binary, title, rule, description, link, columns")
    .ilike("binary", `%${binary}%`);

  if (error) throw error;

  const rows = (data ?? []).map((r: any) => ({
    ...r,
    binary_raw: r.binary ?? "",
    title_raw: r.title ?? "",
    binary: String(r.binary ?? "").trim(),
    title: String(r.title ?? ""),
    columns: toColumns(r.columns),
  })) as RuleRow[];

  return rows;
}

async function fetchTrafficAll(): Promise<TrafficRow[]> {
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

  const rows = (data ?? []).map((r: any) => ({ ...r, ts: r.timestamp })) as TrafficRow[];
  return rows;
}

export default async function BinPage({
  params,
}: {
  params: Promise<{ binary: string }>;
}) {
  const user = await getAppSession();
  if (!user) redirect("/login");

  const { binary } = await params;
  const decodedBinary = decodeURIComponent(binary);

  const [rules, traffic] = await Promise.all([
    fetchRulesFor(decodedBinary),
    fetchTrafficAll(),
  ]);

  return (
    <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
      <BinRulesClient binary={decodedBinary} rules={rules as any} traffic={traffic as any} />
      <BinFooter binary={decodedBinary} />
    </main>
  );
}
