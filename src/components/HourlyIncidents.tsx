"use client";

import { useEffect, useMemo, useState } from "react";
import BarChartHours from "@/components/BarChartHours";
import BarChart from "@/components/BarChart"; // el que ya usas en ChartStats

type RangeKey = "24h" | "7d" | "30d";
type ApiPoint = { key: string; incidents: number };

function weekdayLabel(dayISO: string): string {
  const d = new Date(`${dayISO}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short" })
    .format(d)
    .replace(".", "")
    .replace(/^./, (c) => c.toUpperCase());
}

function lastNDaysISO(n: number): string[] {
  const base = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);

    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const da = parts.find((p) => p.type === "day")?.value;
    out.push(`${y}-${m}-${da}`);
  }
  return out;
}

export default function HourlyIncidents() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [points, setPoints] = useState<ApiPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/metrics/distribution?range=${range}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setPoints(data.points ?? []);
    } catch (e: any) {
      setPoints([]);
      setErr(e?.message ?? "Error cargando distribución");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [range]);

  const title = useMemo(() => {
    const r = range === "24h" ? "últimas 24h" : range === "7d" ? "últimos 7 días" : "últimos 30 días";
    return `Incidencias · ${r}`;
  }, [range]);

  const map = useMemo(() => new Map(points.map((p) => [p.key, p.incidents])), [points]);

  const dataFor24h = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, "0")}:00`,
      value: map.get(String(h).padStart(2, "0")) ?? 0,
    }));
  }, [map]);

  const dataFor7d = useMemo(() => {
  const days = lastNDaysISO(7);
  return days.map((day) => ({
    label: day.slice(8, 10), // ✅ "08", "09", ...
    value: map.get(day) ?? 0,
  }));
}, [map]);


  const dataFor30d = useMemo(() => {
    const days = lastNDaysISO(30);
    return days.map((day) => ({
      label: day.slice(8, 10), // "09"
      value: map.get(day) ?? 0,
    }));
  }, [map]);

  return (
    <div className="bg-[#F5F4CB] rounded-md border border-emerald-900/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-emerald-950">{title}</h3>

        <div className="flex rounded-lg overflow-hidden border border-emerald-900/20">
          {[
            { k: "24h", label: "24h" },
            { k: "7d", label: "Semana" },
            { k: "30d", label: "Mes" },
          ].map((x) => (
            <button
              key={x.k}
              type="button"
              onClick={() => setRange(x.k as RangeKey)}
              className={[
                "px-3 py-2 text-sm font-semibold transition cursor-pointer",
                range === x.k ? "bg-[#135B0A] text-[#F5F4CB]" : "bg-white/40 text-emerald-950 hover:bg-white/55",
              ].join(" ")}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {err ? <p className="text-sm text-red-700 mb-2">{err}</p> : null}
      {loading ? (
        <p className="text-sm text-emerald-900/70">Cargando…</p>
      ) : range === "24h" ? (
        <BarChartHours data={dataFor24h} />
      ) : (
        <BarChart data={range === "7d" ? dataFor7d : dataFor30d} thinBars={range === "30d"} />
      )}
    </div>
  );
}
