
export const runtime = 'nodejs';


import { supabaseServer } from "@/lib/supabase";
import RuleCard from "@/components/RuleCard";





const SNAKE_MAP: Record<string, string> = {
  "user.name": "user_name",
  "host.name": "host_name",
  "process.name": "process_name",
  "process.executable": "process_executable",
  "process.command_line": "process_command_line",
  "process.parent.name": "process_parent_name",
  "process.pid": "process_pid",
  "process.args": "process_args",
  "agent.name": "agent_name",
  "event.type": "event_type",
  "event.id": "event_id",
  "host.ip": "host_ip",
  "source.ip": "source_ip",
  "destination.ip": "destination_ip",
  "user.id": "user_id",
  "timestamp": "ts",
};

/* Tipos en BD */
type RuleRow = {
  id?: string;                  // 👈 añadido
  binary: string;
  title: string;
  rule: string;
  description: string;
  link: string;
  columns: string[];            // text[]
};

type TrafficRow = Record<string, unknown>;


function normalizeQuotes(expr: string): string {
  return expr
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}


/* === helpers de coincidencia (los mismos que ya usas) === */
function norm(val: unknown): string {
  return String(val ?? "").replace(/\\/g, "/").toLowerCase();
}
function matchWithWildcards(haystack: string, pattern: string): boolean {
  const pat = pattern.toLowerCase();
  const str = haystack.toLowerCase();
  const startsStar = pat.startsWith("*");
  const endsStar = pat.endsWith("*");
  const core = pat.replace(/^\*+/, "").replace(/\*+$/, "");
  if (!pat.includes("*")) return str.includes(core);
  if (startsStar && endsStar) return str.includes(core);
  if (startsStar) return str.endsWith(core);
  if (endsStar) return str.startsWith(core);
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp("^" + pat.split("*").map(esc).join(".*") + "$");
  return rx.test(str);
}
function normalizeFieldName(field: string) {
  const f = field.trim().toLowerCase();
  if (f === "process.prante.name") return "process.parent.name";
  return f;
}
export function buildPredicate(raw: string): (row: Record<string, any>) => boolean {
  console.log('Building predicate for rule:', raw);
  const step1 = rewriteFieldComparisons(raw);
  console.log('After field comparisons:', step1);
  const step2 = rewriteLogicalOps(step1);
  console.log('After logical ops:', step2);
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    "row", "__wc", "__get",
    `try { return !!(${step2}); } catch (e) { console.error('Rule evaluation error:', e); return false; }`
  ) as (row: any, __wc: typeof wcMatch, __get: typeof getField) => boolean;

  return (row: Record<string, any>) => {
    const result = fn(row, wcMatch, getField);
    console.log('Rule evaluation result:', result);
    return result;
  };
}

function toColumns(c: unknown): string[] {
  if (Array.isArray(c)) return c as string[];
  if (typeof c === "string") {
    try { const p = JSON.parse(c); if (Array.isArray(p)) return p.map(String); } catch { }
    return c.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}
async function fetchRulesFor(binary: string): Promise<RuleRow[]> {
  const supabase = supabaseServer();

  // 👇 importante: TRIM en el lado SQL para quitar espacios finales
  const { data, error } = await supabase
    .from("rules")
    .select("binary, title, rule, description, link, columns") // no 'id'
    .ilike("binary", `%${binary}%`);

  if (error) throw error;

  const rows = (data ?? []).map((r: any) => ({
    ...r,
    // keep raw DB values for precise UPDATE matching
    binary_raw: r.binary ?? "",
    title_raw: r.title ?? "",
    // UI values (trimmed)
    binary: String(r.binary ?? "").trim(),
    title: String(r.title ?? ""),
    columns: toColumns(r.columns),
  })) as RuleRow[];


  return rows;
}


async function fetchTrafficAll(): Promise<TrafficRow[]> {
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

  // Normalizamos a 'ts' como usas en la app
  const rows = (data ?? []).map((r: any) => ({ ...r, ts: r.timestamp })) as TrafficRow[];



  return rows;
}

function getField(row: Record<string, any>, path: string): string {
  // alias simple event.action -> event.type si lo usas en reglas
  if (path === "event.action") path = "event.type";

  // 1) intento con path punteado
  const valDot = path.split(".").reduce<any>((acc, k) => (acc != null ? acc[k] : undefined), row);
  if (valDot != null) return String(valDot);

  // 2) intento con snake_case mapeado
  const snake = SNAKE_MAP[path] ?? path.replace(/\./g, "_");
  const valSnake = row[snake];
  if (valSnake != null) return String(valSnake);

  return "";
}



function wcMatch(value: string, pattern: string): boolean {
  // quita comillas/espacios fortuitos
  value = String(value ?? "").replace(/^"+|"+$/g, "").trim();
  pattern = String(pattern ?? "").trim();

  // convertimos '*' -> '.*' y anclamos a principio/fin
  const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const re = new RegExp(`^${esc}$`, "i");
  return re.test(value);
}


// Reescribe "campo : (\"a\" or \"b\")" =>  match(get(row,campo),"a") || match(get(row,campo),"b")
// y "campo : \"lit\"" => match(get(row,campo),"lit")
// Reescribe campo : ("a" or 'b')  y también  campo : 'lit'
function rewriteFieldComparisons(expr: string): string {
  expr = normalizeQuotes(expr);

  // Acepta: (...)  |  "..."  |  '...'
  const RX = /([a-zA-Z0-9_.]+)\s*:\s*(\((?:[^()]+|\([^()]*\))*\)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;

  return expr.replace(RX, (_m, field, rhs) => {
    const fld = String(field).trim();

    if (rhs.startsWith("(")) {
      const inside = rhs.slice(1, -1);
      const parts = inside.split(/\s+(and|or)\s+/i);
      let out = "";
      for (let i = 0; i < parts.length; i++) {
        const t = parts[i];
        if (/^(and|or)$/i.test(t)) {
          out += t.toLowerCase() === "and" ? " && " : " || ";
        } else {
          const lit = t.trim().replace(/^['"]|['"]$/g, ""); // ← quita ' o "
          out += `__wc(__get(row,"${fld}"), ${JSON.stringify(lit)})`;
        }
      }
      return `(${out})`;
    } else {
      const lit = rhs.trim().replace(/^['"]|['"]$/g, "");   // ← quita ' o "
      return `__wc(__get(row,"${fld}"), ${JSON.stringify(lit)})`;
    }
  });
}


// Reescribe operadores lógicos a JS
function rewriteLogicalOps(expr: string): string {
  return expr
    .replace(/\bnot\b/gi, "!")
    .replace(/\band\b/gi, "&&")
    .replace(/\bor\b/gi, "||");
}


// Compila la expresión a una función booleana: (row) => true|false
function compileRule(raw: string): (row: Record<string, any>) => boolean {
  const step1 = rewriteFieldComparisons(raw);
  const step2 = rewriteLogicalOps(step1);
  // new Function con helpers inyectadas
  return new Function(
    "row", "__wc", "__get",
    `try { return !!(${step2}); } catch (e) { return false; }`
  ) as any;
}



// === PAGE RENDER (server component) ===
export default async function BinPage({
  params,
}: {
  // In this Next version, params is a Promise
  params: Promise<{ binary: string }>;
}) {
  // Await params before using its properties
  const { binary } = await params;
  const decodedBinary = decodeURIComponent(binary);

  // fetch rules (for this bin) and all traffic
  const [rules, traffic] = await Promise.all([
    fetchRulesFor(decodedBinary),
    fetchTrafficAll(),
  ]);

  return (
    <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
      <h1 className="text-5xl font-extrabold text-center text-emerald-900 underline mb-8">
        {decodedBinary}
      </h1>

      {rules.length === 0 ? (
        <p className="text-center text-emerald-900/80">
          No hay reglas para <strong>{decodedBinary}</strong> en <code>rules</code>.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rules.map((rule, idx) => (
            <RuleCard
              key={idx}
              initialRule={{
                id: undefined,
                binary: rule.binary,
                title: rule.title,
                rule: rule.rule,
                description: (rule as any).description ?? "",
                columns: Array.isArray(rule.columns) ? rule.columns : toColumns((rule as any).columns),
                matchBinary: (rule as any).binary_raw ?? rule.binary,
                matchTitle: (rule as any).title_raw ?? rule.title,
              }}
              allRows={traffic as any[]}   // 👈 pass ALL traffic rows; filtering happens in client
            />

          ))}
        </div>
      )}
    </main>
  );
}

