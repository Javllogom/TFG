export const runtime = 'nodejs';

import BinCard from "@/components/BinCard";
import ChartWeekly from "@/components/ChartWeekly";
import { supabaseServer } from "@/lib/supabase";
import { buildPredicate } from "@/lib/ruleEngine";
import HomeStixFooter from "./HomeStixFooter";
import BinGridClient from "./BinGridClient";



/* ===== Tipos ===== */
type RuleRow = {
  binary: string;
  title: string;
  rule: string;
  description: string;
  link: string;
  columns: string[];          // en Supabase definimos text[]
};

type TrafficRow = Record<string, unknown>;


/* ===== Datos desde Supabase ===== */
async function fetchRules(): Promise<RuleRow[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("rules")
    .select("binary, title, rule, description, link, columns")
    .order("binary", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RuleRow[];
}

type DescRow = {
  binary: string;
  desc: string;
};

async function fetchDescriptions(): Promise<DescRow[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("descriptions")
    .select("binary, desc");

  if (error) throw error;
  return (data ?? []) as DescRow[];
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
    ts: r.timestamp, // used for "timestamp" in ruleEngine
  })) as TrafficRow[];
}


/* ===== Sumatorio por binario (solo los que estén en rules) ===== */
async function getBinariesAndCounts() {
  const [rules, traffic] = await Promise.all([fetchRules(), fetchTrafficMinimal()]);

  // normaliza nombres de binario
  const bins = Array.from(
    new Set(rules.map(r => String(r.binary ?? "").trim()).filter(Boolean))
  );

  const items = bins.map(bin => {
    // Compara con .trim() para cada regla
    const rulesForBin = rules.filter(r => String(r.binary ?? "").trim().toLowerCase() === bin.toLowerCase());

    let sum = 0;
    for (const r of rulesForBin) {
      const pred = buildPredicate(r.rule);
      sum += traffic.filter(t => pred(t as any)).length;
    }

    return { name: bin, count: sum, href: `/bin/${encodeURIComponent(bin)}` };
  });

  items.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  return items;
}

/* ===== Página principal ===== */
export default async function HomePage() {
  const [binItems, descriptions] = await Promise.all([
    getBinariesAndCounts(),
    fetchDescriptions(),
  ]);
  const totalHits = binItems.reduce((acc, b) => acc + (b.count ?? 0), 0);
  const top3 = [...binItems]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 3);
  const activeBins = binItems.filter((b) => (b.count ?? 0) > 0).length;
  const inactiveBins = binItems.length - activeBins;

  const descMap = new Map(
    descriptions.map((d) => [String(d.binary).trim().toLowerCase(), d.desc])
  );

  const itemsWithDesc = binItems.map((b) => ({
    ...b,
    desc:
      descMap.get(String(b.name).trim().toLowerCase()) ??
      "Texto provisional: descripción no disponible todavía.",
  }));

  return (
    <main className="min-h-screen bg-[#F5F4CB]">
      <section className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#F5F4CB] rounded-md border border-emerald-900/20 p-5">
          <h2 className="text-xl font-semibold text-emerald-900 mb-2">¡Bienvenido!</h2>

          <p className="text-emerald-950/90 leading-relaxed">
            Se han encontrado{" "}
            <span className="inline-flex items-center rounded-full bg-[#135B0A] text-[#F5F4CB] px-3 py-1 text-sm font-bold">
              {totalHits} incidencias
            </span>{" "}
            en los binarios de Windows monitorizados.
          </p>


          <div className="mt-3">
            <p className="text-sm font-semibold text-emerald-900 mb-2">
              Top 3 binarios con más actividad
            </p>

            {top3.length === 0 ? (
              <p className="text-sm text-emerald-900/70">No hay incidencias todavía.</p>
            ) : (
              <ul className="space-y-1 text-sm text-emerald-950/90">
                {top3.map((b) => (
                  <li key={b.name} className="flex items-center justify-between gap-3">
                    <span className="truncate">{b.name}</span>
                    <span className="font-semibold">{b.count}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center rounded-full bg-emerald-900/10 text-emerald-900 px-3 py-1 font-semibold">
                {activeBins} con actividad
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-900/10 text-emerald-900 px-3 py-1 font-semibold">
                {inactiveBins} sin actividad
              </span>
            </div>

            {top3.length > 0 && (
              <div className="mt-3 flex justify-end">
                <a
                  href={top3[0].href}
                  className="
        inline-flex items-center gap-2
        rounded-full px-4 py-2
        bg-[#135B0A] text-[#F5F4CB]
        border border-emerald-950/30
        shadow-sm
        hover:bg-[#0f3f0a]
        active:bg-[#0b3207]
        transition
        text-sm font-semibold
      "
                >
                  Ir al más activo
                  <span className="text-[#F5F4CB]/80">→</span>
                </a>
              </div>
            )}

          </div>
        </div>

        <ChartWeekly totalIncidents={totalHits} />
      </section>

      <BinGridClient items={itemsWithDesc} />

      <HomeStixFooter />
    </main>
  );
}