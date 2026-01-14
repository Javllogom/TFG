"use client";

import { useEffect, useMemo, useState } from "react";
import LineChart from "@/components/LineChart";
import LineChartBins from "@/components/LineChartBins";


type RangeKey = "24h" | "7d" | "30d";
type ApiPoint = { x: string; y: number };

export default function BinaryTrend() {
  const [bins, setBins] = useState<string[]>([]);
  const [binary, setBinary] = useState<string>("");
  const [range, setRange] = useState<RangeKey>("7d");
  const [points, setPoints] = useState<ApiPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadBins() {
    const res = await fetch("/api/metrics/binaries", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error(data.error ?? "Failed");
    setBins(data.bins ?? []);
    if (!binary && (data.bins?.[0] ?? "")) setBinary(data.bins[0]);
  }

  async function loadSeries(b: string, r: RangeKey) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/metrics/timeseries?binary=${encodeURIComponent(b)}&range=${r}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setPoints(data.points ?? []);
    } catch (e: any) {
      setPoints([]);
      setErr(e?.message ?? "Error cargando serie");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBins().catch((e) => setErr(e?.message ?? "Error cargando binarios"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!binary) return;
    loadSeries(binary, range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binary, range]);

  const chartData = useMemo(() => {
    if (range === "24h") {
      return points.map((p) => ({ label: p.x.slice(11, 16), value: p.y })); // HH:00
    }
    return points.map((p) => ({ label: p.x.slice(8, 10), value: p.y })); // DD
  }, [points, range]);

  const title = useMemo(() => {
    if (!binary) return "Evolución de incidencias";
    if (range === "24h") return `Evolución · ${binary} · últimas 24h`;
    if (range === "7d") return `Evolución · ${binary} · últimos 7 días`;
    return `Evolución · ${binary} · últimos 30 días`;
  }, [binary, range]);

  return (
    <div className="bg-[#F5F4CB] rounded-md border border-emerald-900/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-emerald-950">{title}</h3>

        <div className="flex items-center gap-2">
          <select
            value={binary}
            onChange={(e) => setBinary(e.target.value)}
            className="bg-white/40 rounded-lg px-3 py-2 text-emerald-950 outline-none cursor-pointer"
          >
            {bins.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

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
      </div>

      {err ? <p className="text-sm text-red-700 mb-2">{err}</p> : null}
      {loading ? <p className="text-sm text-emerald-900/70">Cargando…</p> : <LineChart data={chartData} />}
    </div>
  );
}
