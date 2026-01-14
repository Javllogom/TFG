"use client";

import { useEffect, useMemo, useState } from "react";

type RangeKey = "7d" | "30d";
type ApiResp = { ok: boolean; range?: RangeKey; matrix?: number[][]; max?: number; error?: string };

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function colorFor(v: number) {
  if (v <= 0) return "#E7E5CF";        // 0
  if (v <= 20) return "#CFE7D2";       // 1–20
  if (v <= 40) return "#8FD19A";       // 21–40
  if (v <= 60) return "#5DBB73";       // 41–60
  if (v <= 80) return "#3FA35A";       // 61–80
  return "#166534";                    // 81–100+
}


export default function HeatmapWeekHour() {
    const [range, setRange] = useState<RangeKey>("7d");
    const [matrix, setMatrix] = useState<number[][]>(Array.from({ length: 7 }, () => Array(24).fill(0)));
    const [max, setMax] = useState(0);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch(`/api/metrics/heatmap?range=${range}`, { cache: "no-store" });
            const data = (await res.json().catch(() => ({}))) as ApiResp;
            if (!res.ok || !data.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
            setMatrix(data.matrix ?? Array.from({ length: 7 }, () => Array(24).fill(0)));
            setMax(data.max ?? 0);
        } catch (e: any) {
            setErr(e?.message ?? "Error cargando heatmap");
            setMatrix(Array.from({ length: 7 }, () => Array(24).fill(0)));
            setMax(0);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, [range]);

    const title = useMemo(() => {
        return range === "7d" ? "Heatmap · Semana (día × hora)" : "Heatmap · Mes (día × hora)";
    }, [range]);

    const W = 980;
    const H = 330;

    const padLeft = 60;
    const padRight = 18;
    const padTop = 26;
    const padBottom = 42;

    const innerW = W - padLeft - padRight;
    const innerH = H - padTop - padBottom;

    const cellW = innerW / 24;
    const cellH = innerH / 7;

    const hourTickEvery = 2; // show 0,2,4...22

    return (
        <div className="bg-[#F5F4CB] rounded-md border border-emerald-900/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-emerald-950">{title}</h3>

                <div className="flex rounded-lg overflow-hidden border border-emerald-900/20">
                    {[
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
            {loading ? <p className="text-sm text-emerald-900/70 mb-2">Cargando…</p> : null}

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-72">
                {/* X axis */}
                <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom} stroke="#0f3f2e" strokeWidth="2" />
                {/* Y axis */}
                <line x1={padLeft} y1={padTop} x2={padLeft} y2={H - padBottom} stroke="#0f3f2e" strokeWidth="2" />

                {/* Day labels */}
                {DAYS.map((d, i) => {
                    const y = padTop + i * cellH + cellH / 2;
                    return (
                        <text key={d} x={padLeft - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#0f3f2e">
                            {d}
                        </text>
                    );
                })}

                {/* Hour labels */}
                {Array.from({ length: 24 }, (_, h) => h).map((h) => {
                    if (h % hourTickEvery !== 0) return null;
                    const x = padLeft + h * cellW + cellW / 2;
                    return (
                        <text key={h} x={x} y={H - 14} textAnchor="middle" fontSize="11" fill="#0f3f2e">
                            {h}
                        </text>
                    );
                })}

                {/* Cells */}
                {matrix.map((row, dayIdx) =>
                    row.map((v, hour) => {
                        const x = padLeft + hour * cellW + 1;
                        const y = padTop + dayIdx * cellH + 1;
                        const fill = colorFor(v);
                        return (
                            <rect
                                key={`${dayIdx}-${hour}`}
                                x={x}
                                y={y}
                                width={Math.max(1, cellW - 2)}
                                height={Math.max(1, cellH - 2)}
                                rx={3}
                                fill={fill}
                            >
                                <title>{`${DAYS[dayIdx]} · ${String(hour).padStart(2, "0")}:00 — ${v} incidencias`}</title>
                            </rect>
                        );
                    })
                )}
            </svg>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-end gap-3 text-xs text-emerald-950">
                <span className="mr-1">Incidencias:</span>

                {[
                    { c: "#CFE7D2", l: "1–20" },
                    { c: "#8FD19A", l: "21–40" },
                    { c: "#5DBB73", l: "41–60" },
                    { c: "#3FA35A", l: "61–80" },
                    { c: "#166534", l: "81–100+" },
                ].map((x) => (
                    <span key={x.l} className="flex items-center gap-1">
                        <span
                            className="inline-block w-6 h-4 rounded-sm border border-emerald-900/20"
                            style={{ backgroundColor: x.c }}
                        />
                        {x.l}
                    </span>
                ))}
            </div>
        </div>
    );
}
