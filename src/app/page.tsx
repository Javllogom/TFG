export const runtime = 'nodejs';

import BinCard from "@/components/BinCard";
import ChartWeekly from "@/components/ChartWeekly";
import { supabaseServer } from "@/lib/supabase";

/* ===== Tipos ===== */
type RuleRow = {
  binary: string;
  title: string;
  rule: string;
  description: string;
  link: string;
  columns: string[];          // en Supabase definimos text[]
};
type TrafficRow = {
  ts: string;
  user_name: string;
  host_name: string;
  process_executable: string;
  process_command_line: string;
  process_parent_name: string;
};

/* ===== Helpers parser (motor unificado) ===== */
function normalizeQuotes(expr: string): string {
  return expr.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

// Acceso a campos + alias snake_case como en el detalle
const SNAKE_MAP: Record<string, string> = {
  "user.name": "user_name",
  "host.name": "host_name",
  "process.name": "process_name",
  "process.executable": "process_executable",
  "process.command_line": "process_command_line",
  "process.parent.name": "process_parent_name",
  "event.type": "event_type",
  "event.action": "event_type", // alias
  "timestamp": "ts",
};
function getField(row: Record<string, any>, path: string): string {
  const dot = path.split(".").reduce<any>((a, k) => (a != null ? a[k] : undefined), row);
  if (dot != null) return String(dot);
  const snake = SNAKE_MAP[path] ?? path.replace(/\./g, "_");
  return String(row[snake] ?? "");
}

function wcMatch(value: string, pattern: string): boolean {
  value = String(value ?? "").replace(/^"+|"+$/g, "").trim();
  pattern = String(pattern ?? "").trim();
  const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const re = new RegExp(`^${esc}$`, "i");
  return re.test(value);
}

// Reescribe campo: ("a" or 'b') y campo: 'lit' / "lit"
function rewriteFieldComparisons(expr: string): string {
  expr = normalizeQuotes(expr);
  const RX = /([a-zA-Z0-9_.]+)\s*:\s*(\((?:[^()]+|\([^()]*\))*\)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
  return expr.replace(RX, (_m, field, rhs) => {
    const fld = String(field).trim();
    if (rhs.startsWith("(")) {
      const inside = rhs.slice(1, -1);
      const parts = inside.split(/\s+(and|or)\s+/i);
      let out = "";
      for (let i = 0; i < parts.length; i++) {
        const t = parts[i];
        if (/^(and|or)$/i.test(t)) out += t.toLowerCase() === "and" ? " && " : " || ";
        else {
          const lit = t.trim().replace(/^['"]|['"]$/g, "");
          out += `__wc(__get(row,"${fld}"), ${JSON.stringify(lit)})`;
        }
      }
      return `(${out})`;
    } else {
      const lit = rhs.trim().replace(/^['"]|['"]$/g, "");
      return `__wc(__get(row,"${fld}"), ${JSON.stringify(lit)})`;
    }
  });
}
function rewriteLogicalOps(expr: string): string {
  return expr.replace(/\bnot\b/gi, "!").replace(/\band\b/gi, "&&").replace(/\bor\b/gi, "||");
}
function buildPredicate(raw: string | undefined) {
  const text = normalizeQuotes(String(raw ?? ""));
  const step1 = rewriteFieldComparisons(text);
  const step2 = rewriteLogicalOps(step1);
  // eslint-disable-next-line no-new-func
  // === REEMPLAZA DESDE AQUÍ (la línea que te falla) ===
  const fn = new Function(
    "row",
    "__wc",
    "__get",
    `try { return !!(${step2}); } catch(e){ return false; }`
  ) as unknown as (row: Record<string, any>, __wc: typeof wcMatch, __get: typeof getField) => boolean;

  return (row: Record<string, any>) => fn(row, wcMatch, getField);
  // === HASTA AQUÍ ===

}


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
    user_name:"user.name",
    host_name:"host.name",
    process_name:"process.name",                    
    process_executable:"process.executable",
    process_command_line:"process.command_line",
    process_parent_name:"process.parent.name"
  `);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    ts: r.timestamp,
    user_name: r.user_name,
    host_name: r.host_name,
    process_name: r.process_name,
    process_executable: r.process_executable,
    process_command_line: r.process_command_line,
    process_parent_name: r.process_parent_name,
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
    // 🔧 FIX: compara con .trim() para cada regla
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

      <section className="max-w-7xl mx-auto px-4 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {binItems.map((b) => (
            <BinCard key={b.name} name={b.name} count={b.count} href={b.href} />
          ))}
        </div>
        {binItems.length === 0 && (
          <div className="text-center text-emerald-900/80 mt-8">
            No se han encontrado binarios en <code>rules</code>.
          </div>
        )}
      </section>
    </main>
  );
}
