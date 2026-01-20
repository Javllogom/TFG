"use server";

import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/protectedRoute";

type PanelPayload = {
  title: string;
  rule: string;
  description?: string | null;
  link?: string | null;
  columns: string[];
};

type PanelOrderItem = {
  id: string | number;
  sort_order: number;
};

export async function updatePanelInDb(payload: PanelPayload, where: { id: string }) {
  await requireAdmin();

  const id = String(where?.id ?? "").trim();
  if (!id) throw new Error("Falta el id del panel.");

  const title = payload.title.trim();
  const rule = payload.rule.trim();
  const description = (payload.description ?? "").trim();
  const link = (payload.link ?? "").trim();
  const columns = (payload.columns ?? []).map(c => c.trim()).filter(Boolean);

  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("panels")
    .update({
      title,
      rule,
      description: description || null,
      link: link || null,
      columns,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, title, rule, description, link, columns")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("No se actualizó el panel (id no existe o no tienes permisos/RLS).");

  return data;
}

export async function updatePanelsOrderInDb(items: PanelOrderItem[]) {
  await requireAdmin();

  const clean = (items ?? [])
    .map((x) => ({ id: String(x.id).trim(), sort_order: Number(x.sort_order) }))
    .filter((x) => x.id && Number.isFinite(x.sort_order));

  if (clean.length === 0) return { ok: false, error: "No items" };

  const supabase = supabaseServer();
  const now = new Date().toISOString();

  const results = await Promise.all(
    clean.map((x) =>
      supabase
        .from("panels")
        .update({ sort_order: x.sort_order, updated_at: now })
        .eq("id", x.id)
        .select("id, sort_order")
        .maybeSingle()
    )
  );

  const firstErr = results.find((r) => r.error)?.error;
  if (firstErr) throw new Error(firstErr.message);

  const updated = results.map((r) => r.data).filter(Boolean);
  return { ok: true, updated };
}




