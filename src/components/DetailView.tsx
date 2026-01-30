"use client";

import Link from "next/link";
import ResizableTable from "@/components/ResizableTable";

type Props = {
  title: string;
  description?: string | null;
  link?: string | null;
  count: number;
  backHref: string;
  backLabel?: string;
  columns: string[];
  rows: Array<Record<string, any>>;
};

export default function DetailView({
  title,
  description,
  link,
  count,
  backHref,
  backLabel = "Volver",
  columns,
  rows,
}: Props) {
  return (
    <main className="min-h-screen bg-[#F5F4CB] w-screen max-w-none px-4 sm:px-6 py-10">
      <div className="w-full max-w-none">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-5xl font-extrabold text-emerald-950">{title}</h1>

          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="rounded-full px-6 py-3 bg-[#135B0A] text-white font-semibold hover:opacity-90 transition"
            >
              {backLabel}
            </Link>

            <span className="rounded-full px-5 py-3 bg-emerald-900/10 text-emerald-950 font-semibold">
              {count} incidencias
            </span>
          </div>
        </div>

        {description ? (
          <p className="mt-5 text-emerald-950/90 leading-relaxed text-[15px] max-w-[1200px]">
            {description}
          </p>
        ) : null}

        {link ? (
          <div className="mt-4">
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline text-emerald-950"
            >
              Fuente / referencia
            </a>
          </div>
        ) : null}

        <div className="h-[3px] bg-emerald-900/30 rounded-md my-6" />

        <div className="bg-[#135B0A] text-white rounded-lg p-4 shadow-md border border-emerald-950">
          <ResizableTable columns={columns} rows={rows} minColWidth={120} />
        </div>
      </div>
    </main>
  );
}
