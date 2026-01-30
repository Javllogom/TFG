// src/components/PanelDetailView.tsx
"use client";

import Link from "next/link";
import ResizableTable from "@/components/ResizableTable";

export default function PanelDetailView({
  backHref,
  title,
  description,
  link,
  incidentsCount,
  columns,
  rows,
}: {
  backHref: string;
  title: string;
  description?: string | null;
  link?: string | null;
  incidentsCount: number;
  columns: string[];
  rows: Array<Record<string, any>>;
}) {
  return (
    <main className="min-h-screen bg-[#F5F4CB] w-screen max-w-none px-4 sm:px-6 py-10">
      <div className="w-full max-w-none">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-5xl font-black text-emerald-950 tracking-tight">
            {title}
          </h1>

          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center rounded-full px-6 py-3 bg-[#135B0A] text-[#F5F4CB] font-semibold hover:opacity-90"
            >
              Volver
            </Link>

            <span className="inline-flex items-center rounded-full px-6 py-3 bg-emerald-900/15 text-emerald-950 font-semibold">
              {incidentsCount} incidencias
            </span>
          </div>
        </div>

        {description ? (
          <p className="mt-6 text-emerald-950/90 text-[18px] leading-8 max-w-none">
            {description}
          </p>
        ) : null}

        {link ? (
          <a
            className="mt-6 inline-block text-emerald-950 underline font-semibold"
            href={link}
            target="_blank"
            rel="noreferrer"
          >
            Fuente / referencia
          </a>
        ) : null}

        <div className="mt-8 bg-[#135B0A] text-white rounded-xl p-4 shadow-md border border-emerald-950">
          <ResizableTable columns={columns} rows={rows} minColWidth={120} />
        </div>
      </div>
    </main>
  );
}
