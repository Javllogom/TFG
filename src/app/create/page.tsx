export const runtime = "nodejs";

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { getAppSession } from "@/lib/protectedRoute";
import PanelsGridClient from "./PanelsGridClient";

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
    try {
      const p = JSON.parse(c);
      if (Array.isArray(p)) return p.map(String);
    } catch { }
    return c.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

async function fetchPanels() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("panels")
    .select("id, title, rule, description, link, columns, sort_order")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p: PanelRow) => ({
    ...p,
    columns: toColumns(p.columns),
  }));
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

  return (data ?? []).map((r: any) => ({ ...r, ts: r.timestamp })) as TrafficRow[];
}

export default async function CreatePage() {
  const user = await getAppSession();
  if (!user) redirect("/login");

  const [panels, traffic] = await Promise.all([fetchPanels(), fetchTrafficMinimal()]);

  return (
    <main className="min-h-screen bg-[#F5F4CB] w-screen max-w-none px-4 sm:px-6 py-10">
      <div className="w-full max-w-none">
        <h1 className="text-4xl font-bold text-emerald-950 mb-8 text-center">
          Crear
        </h1>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <Link
            href="/create/panel"
            className="w-full block rounded-xl border border-emerald-900/20 bg-white/20 p-6 hover:bg-white/30 hover:shadow-md transition"
          >
            <h2 className="text-2xl font-bold text-emerald-950 mb-2">Crear panel desde 0</h2>
            <p className="text-emerald-950/80">Crea un nuevo panel manualmente y añade su información inicial.</p>
          </Link>

          <Link
            href="/create/import-stix"
            className="w-full block rounded-xl border border-emerald-900/20 bg-white/20 p-6 hover:bg-white/30 hover:shadow-md transition"
          >
            <h2 className="text-2xl font-bold text-emerald-950 mb-2">Importar STIX</h2>
            <p className="text-emerald-950/80">Sube un JSON STIX para generar paneles automáticamente.</p>
          </Link>
        </section>

        <PanelsGridClient panels={panels as any} traffic={traffic as any} />
      </div>
    </main>
  );

}
