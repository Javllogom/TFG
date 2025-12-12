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
  const binItems = await getBinariesAndCounts();

  return (
    <main className="min-h-screen bg-[#F5F4CB]">
      <section className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#F5F4CB] rounded-md border border-emerald-900/20 p-5">
          <h2 className="text-xl font-semibold text-emerald-900 mb-2">¡Bienvenido!</h2>
          <p className="text-emerald-950/90 leading-relaxed">
            Se han encontrado un total de <strong>incidencias</strong> en binarios de Windows.
            Los binarios con más actividad aparecen resaltados a continuación. (Texto provisional)
          </p>
        </div>
        <ChartWeekly />
      </section>

      <BinGridClient items={binItems} />

      <HomeStixFooter />
    </main>
  );
}