// Shared rule engine (can run in client & server)

// Maps dot.notation to snake_case keys present in your rows
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

function normalizeQuotes(expr: string): string {
  return String(expr ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function getField(row: Record<string, any>, path: string): string {
  if (path === "event.action") path = "event.type";
  const valDot = path.split(".").reduce<any>((acc, k) => (acc != null ? acc[k] : undefined), row);
  if (valDot != null) return String(valDot);
  const snake = SNAKE_MAP[path] ?? path.replace(/\./g, "_");
  const valSnake = row[snake];
  if (valSnake != null) return String(valSnake);
  return "";
}

export function wcMatch(value: string, pattern: string): boolean {
  value = String(value ?? "").replace(/^"+|"+$/g, "").trim();
  pattern = String(pattern ?? "").trim();
  const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const re = new RegExp(`^${esc}$`, "i");
  return re.test(value);
}

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

export function buildPredicate(raw: string): (row: Record<string, any>) => boolean {
  const step1 = rewriteFieldComparisons(String(raw ?? ""));
  const step2 = rewriteLogicalOps(step1);
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    "row",
    "__wc",
    "__get",
    `try { return !!(${step2}); } catch (e) { return false; }`
  ) as unknown as (row: any, __wc: typeof wcMatch, __get: typeof getField) => boolean;

  return (row: Record<string, any>) => fn(row, wcMatch, getField);
}
