"use server";

import { supabaseServer } from "@/lib/supabase";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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

export async function exportAllToStix() {
    const supabase = supabaseServer();

    const { data, error } = await supabase
        .from("rules")
        .select("binary, title, rule, description, link");

    if (error) {
        console.error("Error loading rules for global STIX export:", error);
        throw error;
    }

    const rules = (data ?? []) as {
        binary: string;
        title: string;
        rule: string;
        description?: string;
        link?: string;
    }[];

    const now = new Date().toISOString();
    const projectRoot = process.cwd();
    const publicDir = path.join(projectRoot, "public");
    const stixDir = path.join(publicDir, "stix");
    await fs.mkdir(stixDir, { recursive: true });

    const byBinary = new Map<string, typeof rules>();

    for (const r of rules) {
        const original = String(r.binary ?? "").trim();
        if (!original) continue;
        const safeName = (original.endsWith(".exe") ? original : `${original}.exe`).replace(
            /[\\/:*?"<>|]/g,
            "_"
        );
        const list = byBinary.get(safeName) ?? [];
        list.push(r);
        byBinary.set(safeName, list);
    }

    const manifestPath = path.join(stixDir, "manifest.json");
    console.log("Global STIX export - reading manifest from:", manifestPath);

    let manifest: any | null = null;
    try {
        const raw = await fs.readFile(manifestPath, "utf8");
        manifest = JSON.parse(raw);
    } catch {
        manifest = null;
    }

    if (!manifest) {
        manifest = {
            version: bumpManifestVersion(undefined, now),
            namespace: "binboard",
            bundles: [],
        };
    } else {
        if (!Array.isArray(manifest.bundles)) manifest.bundles = [];
        manifest.version = bumpManifestVersion(manifest.version, now);
        manifest.namespace = manifest.namespace || "binboard";
    }

    for (const [safeBinaryName, rulesForBin] of byBinary.entries()) {
        const bundle = {
            type: "bundle",
            id: `bundle--${randomUUID()}`,
            objects: rulesForBin.map((r) => ({
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

        const bundleFileName = `${safeBinaryName}.bundle.json`;
        const bundlePath = path.join(stixDir, bundleFileName);
        console.log("Writing STIX bundle for", safeBinaryName, "to:", bundlePath);
        await fs.writeFile(bundlePath, JSON.stringify(bundle, null, 2), "utf8");

        const relPath = `/stix/${bundleFileName}`;
        const entry = {
            binary: safeBinaryName,
            path: relPath,
            count: rulesForBin.length,
            modified: now,
        };

        const idx = manifest.bundles.findIndex((b: any) => b.binary === safeBinaryName);
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

    console.log("Writing updated global manifest to:", manifestPath);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    return {
        binaries: byBinary.size,
        manifestPath: "/stix/manifest.json",
    };
}

