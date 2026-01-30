"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { buildPredicate } from "@/lib/ruleEngine";
import ResizableTable from "@/components/ResizableTable";
import RuleSettings from "@/components/RuleSettings";
import { updatePanelsOrderInDb } from "@/app/panels/actions";

type PanelRow = {
  id: string;
  title: string;
  rule: string;
  description?: string | null;
  link?: string | null;
  columns: string[];
  sort_order?: number | null;
};

type TrafficRow = Record<string, unknown>;

export default function PanelsGridClient({
  panels,
  traffic,
}: {
  panels: PanelRow[];
  traffic: TrafficRow[];
}) {
  const [hideEmpty, setHideEmpty] = useState(false);

  // local state (UI)
  const [localPanels, setLocalPanels] = useState<PanelRow[]>(panels);

  // drawer
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);

  const activePanel = useMemo(
    () => localPanels.find((p) => p.id === activePanelId) ?? null,
    [localPanels, activePanelId]
  );

  // matches
  const computed = useMemo(() => {
    return localPanels.map((p) => {
      const pred = buildPredicate(p.rule);
      const rows = (traffic ?? []).filter((t) => pred(t as any));
      return { panel: p, rows, count: rows.length };
    });
  }, [localPanels, traffic]);

  const visible = hideEmpty ? computed.filter((x) => x.count > 0) : computed;

  // columns for drawer
  const availableColumns = useMemo(() => {
    if (!traffic || traffic.length === 0) return [];
    return Array.from(new Set(Object.keys(traffic[0] ?? {}))).sort();
  }, [traffic]);

  // --- Drag & drop (reorder) ---
  const dragIdRef = useRef<string | null>(null);
  const didDragRef = useRef(false);
  const savingOrderRef = useRef(false);

  function onDragStart(panelId: string, e: React.DragEvent) {
    dragIdRef.current = panelId;
    didDragRef.current = false;
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", panelId);
    } catch {}
  }

  function onDragOver(overId: string, e: React.DragEvent) {
    const draggingId = dragIdRef.current;
    if (!draggingId || draggingId === overId) return;

    e.preventDefault();
    didDragRef.current = true;

    setLocalPanels((prev) => {
      const next = [...prev];
      const from = next.findIndex((p) => p.id === draggingId);
      const to = next.findIndex((p) => p.id === overId);
      if (from < 0 || to < 0) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function onDragEnd() {
    dragIdRef.current = null;

    if (!didDragRef.current) return;
    didDragRef.current = false;

    if (savingOrderRef.current) return;
    savingOrderRef.current = true;

    try {
      // 0..n-1
      const items = localPanels.map((p, idx) => ({
        id: p.id,
        sort_order: idx,
      }));

      const res = await updatePanelsOrderInDb(items);
      if (!res?.ok) {
        console.error("Failed to update order");
      }
    } catch (e) {
      console.error(e);
    } finally {
      savingOrderRef.current = false;
    }
  }

  function openSettings(panelId: string) {
    setActivePanelId(panelId);
    setSettingsOpen(true);
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-emerald-950">Paneles</h2>

        <button
          type="button"
          onClick={() => setHideEmpty((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-[#135B0A] text-[#F5F4CB] hover:opacity-90 transition cursor-pointer"
          title={hideEmpty ? "Mostrar vacíos" : "Ocultar vacíos"}
        >
          <span className="text-lg">👁</span>
          {hideEmpty ? "Mostrar vacíos" : "Ocultar vacíos"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visible.map(({ panel, rows }) => (
          <div
            key={panel.id}
            className="bg-[#135B0A] text-white rounded-lg p-4 shadow-md border border-emerald-950"
          >
            {/* Header draggable */}
            <div
              draggable
              onDragStart={(e) => onDragStart(panel.id, e)}
              onDragOver={(e) => onDragOver(panel.id, e)}
              onDragEnd={onDragEnd}
              className="flex items-center justify-between gap-3 cursor-move"
              title="Arrastra para reordenar"
            >
              <Link
                href={`/panels/${panel.title}`}
                onClick={(e) => {
                  // If user just dragged, don’t navigate
                  if (didDragRef.current) e.preventDefault();
                }}
                className="font-semibold text-lg underline-offset-2 hover:underline truncate cursor-move"
                title={panel.title}
              >
                {panel.title || "(Panel sin título)"}
              </Link>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openSettings(panel.id);
                }}
                className="rounded-md p-1 hover:bg-white/10 active:bg-white/20 cursor-pointer"
                aria-label="Settings"
                title="Settings"
              >
                <Image
                  src="/images/white_gear.png"
                  alt="Settings"
                  width={22}
                  height={22}
                  className="opacity-90"
                />
              </button>
            </div>

            <div className="h-[3px] bg-white/70 rounded-md my-2" />

            <ResizableTable
              columns={panel.columns}
              rows={rows as Array<Record<string, any>>}
              minColWidth={120}
            />

            {panel.link ? (
              <div className="mt-3 flex justify-end">
                <a
                  href={panel.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline hover:text-[#F7F5D7]"
                >
                  Referencia
                </a>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Drawer (reutilizado) */}
      {activePanel ? (
        <RuleSettings
          mode="panel"
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          availableColumns={availableColumns}
          initial={{
            id: activePanel.id,
            title: activePanel.title,
            rule: activePanel.rule,
            description: activePanel.description ?? "",
            link: activePanel.link ?? "",
            columns: activePanel.columns,
          }}
          onSaved={(u: any) => {
            setLocalPanels((prev) =>
              prev.map((p) => (p.id === u.id ? { ...p, ...u } : p))
            );
          }}
        />
      ) : null}
    </section>
  );
}
