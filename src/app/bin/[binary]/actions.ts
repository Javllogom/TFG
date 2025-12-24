"use server";

import { supabaseServer } from "@/lib/supabase";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/protectedRoute";



const DEFAULT_COLUMNS = [
  "timestamp",
  "user.name",
  "host.name",
  "process.executable",
  "process.command_line",
  "process.parent.name",
];

type RulePayload = {
  title: string;
  rule: string;
  description?: string;
  columns: string[];
};

type RuleMatch = {
  id?: string;
  matchBinary: string;
  matchTitle: string;
};

export async function updateRuleInDb(
  
  payload: {
    title: string;
    rule: string;
    description?: string;
    columns: string[];
  },
  match: {
    id?: string;
    matchBinary: string;
    matchTitle: string;
  }
) {
  // 🔒 BLOQUEO REAL
  await requireAdmin();

  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("rules")
    .update({
      title: payload.title,
      rule: payload.rule,
      description: payload.description,
      columns: payload.columns,
    })
    .eq("binary", match.matchBinary)
    .eq("title", match.matchTitle)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
function escapeForRegex(input: string): string {
  return input.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}


function bumpManifestVersion(oldVersion: string | undefined, nowIso: string): string {
  const today = nowIso.slice(0, 10).replace(/-/g, "."); // YYYY.MM.DD
  if (oldVersion && oldVersion.startsWith(today)) {
    const m = oldVersion.match(/-(\d+)$/);
    const n = m ? parseInt(m[1], 10) + 1 : 2;
    return `${today}-${n}`;
  }
  return `${today}-1`;
}

export async function exportBinaryToStix(binary: string) {
  await requireAdmin();
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("rules")
    .select("binary, title, rule, description, link")
    .ilike("binary", `%${binary}%`);

  if (error) {
    console.error("Error loading rules for STIX export:", error);
    throw error;
  }

  const rules = data ?? [];
  const now = new Date().toISOString();

  const bundle = {
    type: "bundle",
    id: `bundle--${randomUUID()}`,
    objects: rules.map((r: any) => ({
      type: "indicator",
      spec_version: "2.1",
      id: `indicator--${randomUUID()}`,
      created: now,
      modified: now,
      name: r.title || `${r.binary} rule`,
      description: r.description ?? "",
      indicator_types: ["malicious-activity"],
      pattern: `[process:command_line MATCHES '^.*${escapeForRegex(
        r.rule ?? ""
      )}.*$']`,
      pattern_type: "stix",
      pattern_version: "2.1",
      valid_from: now,
      labels: ["windows", "lolbin", String(r.binary ?? "").toLowerCase()],
      external_references: r.link
        ? [
          {
            source_name: "rule_source",
            url: r.link,
          },
        ]
        : [],
    })),
  };

  const projectRoot = process.cwd();
  const publicDir = path.join(projectRoot, "public");
  const stixDir = path.join(publicDir, "stix");
  await fs.mkdir(stixDir, { recursive: true });

  const safeBinaryName = (binary.endsWith(".exe") ? binary : `${binary}.exe`).replace(
    /[\\/:*?"<>|]/g,
    "_"
  );
  const bundleFileName = `${safeBinaryName}.bundle.json`;
  const bundlePath = path.join(stixDir, bundleFileName);

  console.log("Writing STIX bundle to:", bundlePath);
  await fs.writeFile(bundlePath, JSON.stringify(bundle, null, 2), "utf8");

  // manifest en public/stix
  const manifestPath = path.join(stixDir, "manifest.json");
  console.log("Reading manifest from:", manifestPath);

  let manifest: any | null = null;
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    manifest = JSON.parse(raw);
  } catch {
    console.warn("manifest.json not found or invalid, will create a new one");
  }

  const binaryKey = safeBinaryName;
  const relPath = `/stix/${bundleFileName}`;
  const entry = {
    binary: binaryKey,
    path: relPath,
    count: rules.length,
    modified: now,
  };

  if (!manifest) {
    manifest = {
      version: bumpManifestVersion(undefined, now),
      namespace: "binboard",
      bundles: [entry],
    };
  } else {
    if (!Array.isArray(manifest.bundles)) manifest.bundles = [];

    manifest.version = bumpManifestVersion(manifest.version, now);
    manifest.namespace = manifest.namespace || "binboard";

    const idx = manifest.bundles.findIndex((b: any) => b.binary === binaryKey);
    if (idx >= 0) {
      manifest.bundles[idx] = entry;
    } else {
      manifest.bundles.push(entry);
    }
  }

  // sort bundles alphabetically by binary
  manifest.bundles = [...manifest.bundles].sort((a: any, b: any) =>
    String(a.binary).localeCompare(String(b.binary), "es", { sensitivity: "base" })
  );

  console.log("Writing updated manifest to:", manifestPath);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  return { path: relPath };
}

