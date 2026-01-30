export const runtime = "nodejs";

import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { getAppSession } from "@/lib/protectedRoute";
import ResizableTable from "@/components/ResizableTable";
import { buildPredicate } from "@/lib/ruleEngine";

type RuleRow = {
  binary: string;
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
    } catch {}
    return c.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

async function fetchRule(binary: string, title: string) {
  const supabase = supabaseServer();

  // ✅ No pedimos rules.id (no existe)
  // ✅ Hacemos ilike para evitar fallos por mayúsculas/espacios raros
  const { data, error } = await supabase
    .from("rules")
    .select("binary, title, rule, description, link, columns")
    .ilike("binary", `%${binary}%`)
    .ilike("title", title)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const r = data as RuleRow;
  return { ...r, columns: toColumns(r.columns) };
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

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({ ...r, ts: r.timestamp })) as TrafficRow[];
}

export default async function RuleDetailPage({
  params,
}: {
  params: { binary: string; title: string };
}) {
  const user = await getAppSession();
  if (!user) redirect("/login");

  const binary = decodeURIComponent(params.binary);
  const title = decodeURIComponent(params.title);

  const [rule, traffic] = await Promise.all([
    fetchRule(binary, title),
    fetchTrafficAll(),
  ]);

  if (!rule) {
    return (
      <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <Link
            href={`/bin/${encodeURIComponent(binary)}`}
            className="underline text-emerald-950"
          >
            Volver
          </Link>
          <h1 className="text-3xl font-bold text-emerald-950 mt-4">
            Regla no encontrada
          </h1>
          <p className="text-emerald-950/80 mt-2">
            Puede ser que el título en la URL no coincida exactamente con el título en la BD.
          </p>
        </div>
      </main>
    );
  }

  // incidencias = matches
  const pred = buildPredicate(rule.rule);
  const rows = (traffic ?? []).filter((t) => pred(t as any));
  const count = rows.length;

  return (
    <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-5xl font-extrabold text-emerald-950">
            {rule.title}
          </h1>

          <div className="flex items-center gap-3">
            <Link
              href={`/bin/${encodeURIComponent(binary)}`}
              className="rounded-full px-5 py-2 bg-[#135B0A] text-[#F5F4CB] font-semibold"
            >
              Volver
            </Link>

            <div className="rounded-full px-4 py-2 bg-emerald-900/10 text-emerald-950 font-semibold">
              {count} incidencias
            </div>
          </div>
        </div>

        {rule.description ? (
          <p className="mt-4 text-emerald-950/90 leading-relaxed">
            {rule.description}
          </p>
        ) : null}

        {rule.link ? (
          <a
            className="mt-4 inline-block underline text-emerald-950"
            href={rule.link}
            target="_blank"
            rel="noreferrer"
          >
            Fuente / referencia
          </a>
        ) : null}

        <div className="mt-6 h-[3px] bg-emerald-900/30 rounded" />

        <div className="mt-6 bg-[#135B0A] text-white rounded-lg p-4 shadow-md border border-emerald-950">
          <ResizableTable
            columns={toColumns(rule.columns)}
            rows={rows as Array<Record<string, any>>}
            minColWidth={120}
          />
        </div>
      </div>
    </main>
  );
}
