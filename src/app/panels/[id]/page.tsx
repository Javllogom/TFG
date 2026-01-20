// src/app/panels/[id]/page.tsx
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { getAppSession } from "@/lib/protectedRoute";
import PanelClient from "./PanelClient";

type PanelRow = {
  id: string;
  title: string;
  rule: string;
  description: string | null;
  link: string | null;
  columns: string[] | string | null;
};

type TrafficRow = Record<string, unknown>;

function toColumns(c: unknown): string[] {
  if (Array.isArray(c)) return c.map(String);
  if (typeof c === "string") {
    // por si viniera como JSON string o CSV
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

async function fetchPanelById(id: string): Promise<PanelRow | null> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("panels")
    .select("id, title, rule, description, link, columns")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as any;
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
    ts: r.timestamp, // por si tu ruleEngine usa "timestamp" desde ts
  })) as TrafficRow[];
}

export default async function PanelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAppSession();
  if (!user) redirect("/login");

  const { id } = await params;

  const [panel, traffic] = await Promise.all([
    fetchPanelById(decodeURIComponent(id)),
    fetchTrafficMinimal(),
  ]);

  if (!panel) redirect("/create"); // o muestra 404 si prefieres

  return (
    <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
      <PanelClient
        panel={{
          id: panel.id,
          title: panel.title,
          rule: panel.rule,
          description: panel.description,
          link: panel.link,
          columns: toColumns(panel.columns),
        }}
        traffic={traffic as any}
      />
    </main>
  );
}
