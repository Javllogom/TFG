"use server";

import fs from "fs/promises";
import path from "path";

type DbConfigPayload = {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
};

function sanitizeLine(v: string): string {
  return v.replace(/\r?\n/g, "").trim();
}

export async function writeEnvLocal(payload: DbConfigPayload) {
  const url = sanitizeLine(payload.url);
  const anonKey = sanitizeLine(payload.anonKey);
  const service = sanitizeLine(payload.serviceRoleKey ?? "");

  if (!url || !anonKey) {
    throw new Error("Missing Supabase URL or anon key");
  }

  const lines = [
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
  ];

  if (service) lines.push(`SUPABASE_SERVICE_ROLE_KEY=${service}`);

  const content = lines.join("\n") + "\n";

  const envPath = path.join(process.cwd(), ".env.local");
  await fs.writeFile(envPath, content, "utf8");

  return { ok: true };
}
