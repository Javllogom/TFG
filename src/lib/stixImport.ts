type StixIndicator = {
  type: string;
  name?: string;
  description?: string;
  pattern?: string;
  pattern_type?: string;
  external_references?: Array<{ url?: string }>;
};

export type ImportedPanelDraft = {
  title: string;
  rule: string;
  description?: string;
  link?: string;
  columns: string[];
};

// Igual que tus defaults (ajústalo si quieres)
export const DEFAULT_COLUMNS = [
  "timestamp",
  "user.name",
  "host.name",
  "process.executable",
  "process.command_line",
  "process.parent.name",
];

function unescapeEscapedRegexChars(input: string) {
  // Inverso de escapeForRegex (al menos para tu set típico)
  // Convierte \. -> .   \* -> *   \( -> (   etc.
  return input.replace(/\\([\\^$.*+?()[\]{}|])/g, "$1");
}

export function stixPatternToRule(pattern: string) {
  // Ej: [process:command_line MATCHES '^.*....\n.*$']
  const m = pattern.match(/MATCHES\s+'([^']+)'/i);
  if (!m?.[1]) throw new Error("STIX inválido: no se encontró MATCHES '...'");
  let inner = m[1];

  // Quita ^.* al inicio
  inner = inner.replace(/^\^\.\*/g, "");

  // Quita el final .*$ (a veces viene en otra línea)
  inner = inner.replace(/(\r?\n)?\.\*\$$/g, "");

  // Normaliza saltos
  inner = inner.replace(/\r\n/g, "\n");

  // Des-escapa lo que escapaste en export
  inner = unescapeEscapedRegexChars(inner);

  return inner.trim();
}

export function parseStixBundleToPanelDraft(json: any): ImportedPanelDraft {
  if (!json || json.type !== "bundle" || !Array.isArray(json.objects)) {
    throw new Error("El JSON no parece un bundle STIX válido (type=bundle, objects=[...]).");
  }

  // Tu bundle suele llevar indicators
  const indicators: StixIndicator[] = json.objects.filter((o: any) => o?.type === "indicator");
  if (indicators.length === 0) throw new Error("STIX inválido: no hay objects type=indicator.");

  // Para esta pantalla, usaremos el 1º indicator (como tu ejemplo)
  const ind = indicators[0];

  if (!ind.name) throw new Error("STIX inválido: falta indicator.name (título).");
  if (!ind.pattern) throw new Error("STIX inválido: falta indicator.pattern.");
  if (ind.pattern_type && ind.pattern_type !== "stix") {
    throw new Error("STIX inválido: pattern_type debe ser 'stix'.");
  }

  const title = String(ind.name).trim();
  const rule = stixPatternToRule(String(ind.pattern));

  // opcionales
  const description = ind.description ? String(ind.description).trim() : "";
  const link =
    ind.external_references?.find((x) => x?.url)?.url?.trim?.() ?? "";

  return {
    title,
    rule,
    description: description || undefined,
    link: link || undefined,
    columns: DEFAULT_COLUMNS,
  };
}

type ImportedPanel = {
  title: string;
  rule: string;
  description: string;
  link: string;
};

function unescapeStixEmbeddedRule(s: string) {
  // Orden importa: primero \\r\\n, luego \\n, luego \\\\…
  return s
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, '"')
    .trim();
}

export function parseStixSingleIndicatorToPanel(jsonText: string): ImportedPanel {
  let bundle: any;
  try {
    bundle = JSON.parse(jsonText);
  } catch {
    throw new Error("El archivo no es JSON válido.");
  }

  if (!bundle || bundle.type !== "bundle" || !Array.isArray(bundle.objects)) {
    throw new Error("STIX inválido: se esperaba un bundle con objects.");
  }

  if (bundle.objects.length !== 1) {
    throw new Error("Este importador solo soporta 1 objeto (1 panel) por ahora.");
  }

  const obj = bundle.objects[0];
  if (!obj || obj.type !== "indicator") {
    throw new Error("STIX inválido: se esperaba un indicator.");
  }

  const title = String(obj.name ?? "").trim();
  if (!title) throw new Error("STIX inválido: falta name (título).");

  const pattern = String(obj.pattern ?? "");
  if (!pattern) throw new Error("STIX inválido: falta pattern.");

  // Extrae lo que hay entre '^.*' y '.*$'
  // Soporta saltos de línea dentro del pattern
  const m = pattern.match(/MATCHES\s+'\\\^\.\*(.*)\.\*\\\$'/s);
  if (!m || !m[1]) {
    throw new Error("STIX inválido: pattern no tiene el formato esperado (MATCHES '^.*...*$').");
  }

  const embedded = m[1];
  const rule = unescapeStixEmbeddedRule(embedded);

  const description = String(obj.description ?? "").trim();
  const link =
    String(obj.external_references?.[0]?.url ?? "").trim();

  return { title, rule, description, link };
}
