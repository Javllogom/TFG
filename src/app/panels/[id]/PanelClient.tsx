// src/app/panels/[id]/PanelClient.tsx
"use client";

import { useMemo } from "react";
import ResizableTable from "@/components/ResizableTable";
import { buildPredicate } from "@/lib/ruleEngine";
import Link from "next/link";

type Panel = {
  id: string;
  title: string;
  rule: string;
  description: string | null;
  link: string | null;
  columns: string[];
};

export default function PanelClient({
  panel,
  traffic,
}: {
  panel: Panel;
  traffic: any[];
}) {
  const rows = useMemo(() => {
    try {
      const pred = buildPredicate(panel.rule);
      return (traffic ?? []).filter((r) => pred(r));
    } catch {
      return [];
    }
  }, [traffic, panel.rule]);

  return (
    <section className="max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-emerald-950 truncate">
            {panel.title}
          </h1>

          {panel.description ? (
            <p className="mt-2 text-emerald-950/80 leading-relaxed">
              {panel.description}
            </p>
          ) : null}

          {panel.link ? (
            <a
              href={panel.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex mt-3 text-sm font-semibold text-emerald-900 underline hover:opacity-80"
            >
              Fuente / referencia
            </a>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-none">
          <Link
            href="/create"
            className="rounded-full px-4 py-2 bg-[#135B0A] text-[#F5F4CB] font-semibold hover:bg-[#0f3f0a] transition"
          >
            Volver
          </Link>

          <span className="inline-flex items-center rounded-full bg-emerald-900/10 text-emerald-900 px-3 py-2 text-sm font-bold">
            {rows.length} incidencias
          </span>
        </div>
      </div>

      <div className="h-[3px] bg-emerald-900/30 rounded-md mb-4" />

      <div className="bg-[#135B0A] text-white rounded-lg p-4 shadow-md border border-emerald-950">
        <ResizableTable columns={panel.columns} rows={rows} minColWidth={120} />
      </div>
    </section>
  );
}
