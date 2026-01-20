"use server";

import { supabaseServer } from "@/lib/supabase";
import { requireAdmin } from "@/lib/protectedRoute";

type CreatePanelPayload = {
  title: string;
  rule: string;
  description?: string;
  link?: string;
  columns: string[];
};

type UpdatePanelWhere = { id: string };

export async function createPanelInDb(payload: CreatePanelPayload) {
  const user = await requireAdmin();

  const title = payload.title.trim();
  const rule = payload.rule.trim();
  const description = (payload.description ?? "").trim();
  const link = (payload.link ?? "").trim();
  const columns = (payload.columns ?? []).map((c) => c.trim()).filter(Boolean);

  if (!title) throw new Error("Falta el título.");
  if (!rule) throw new Error("Falta la regla.");
  if (columns.length === 0) throw new Error("Selecciona al menos una columna.");

  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("panels")
    .insert({
      title,
      rule,
      description: description || null,
      link: link || null,
      columns,
      created_by: user.id,
      sort_order: Date.now(), // ✅ IMPORTANT
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updatePanelInDb(payload: CreatePanelPayload, where: UpdatePanelWhere) {
  await requireAdmin();

  const id = String(where?.id ?? "").trim();
  if (!id) throw new Error("Falta el id del panel.");

  const title = payload.title.trim();
  const rule = payload.rule.trim();
  const description = (payload.description ?? "").trim();
  const link = (payload.link ?? "").trim();
  const columns = (payload.columns ?? []).map((c) => c.trim()).filter(Boolean);

  if (!title) throw new Error("Falta el título.");
  if (!rule) throw new Error("Falta la regla.");
  if (columns.length === 0) throw new Error("Selecciona al menos una columna.");

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
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}



type PanelOrderItem = { id: string; sort_order: number };

export async function updatePanelsOrderInDb(items: PanelOrderItem[]) {
  await requireAdmin();

  const clean = (items ?? [])
    .map((x) => ({ id: String(x.id).trim(), sort_order: Number(x.sort_order) }))
    .filter((x) => x.id && Number.isFinite(x.sort_order));

  if (clean.length === 0) {
    return { ok: false, error: "No items" };
  }

  const supabase = supabaseServer();

  const { error } = await supabase
    .from("panels")
    .upsert(clean, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
