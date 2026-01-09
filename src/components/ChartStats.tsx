"use client";

import { useEffect, useMemo, useState } from "react";
import BarChart from "./BarChart";

type Mode = "weekly" | "monthly";
type ApiPoint = { day: string; incidents: number };

function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function labelForDay(dayISO: string) {
    return dayISO.slice(8, 10); // "09"
}

function madridDayISO(d = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(d);

    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const da = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${da}`;
}

function weekdayLabel(dayISO: string): string {
    const d = new Date(`${dayISO}T12:00:00Z`);
    return new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid",
        weekday: "short",
    })
        .format(d)
        .replace(".", "")
        .replace(/^./, (c) => c.toUpperCase());
}

function last7MadridDaysISO(): string[] {
    const base = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(base.getDate() - i);
        days.push(madridDayISO(d));
    }
    return days;
}


export default function ChartStats() {
    const [mode, setMode] = useState<Mode>("weekly");
    const [points, setPoints] = useState<ApiPoint[]>([]);
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [month, setMonth] = useState(() => new Date().getMonth()); // 0-based
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setErr(null);

        try {
            const url =
                mode === "weekly"
                    ? "/api/metrics/weekly"
                    : `/api/metrics/monthly?year=${year}&month=${month + 1}`;

            const res = await fetch(url, { cache: "no-store" });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.ok) {
                throw new Error(data.error ?? `Request failed (${res.status})`);
            }

            setPoints(data.points ?? []);
        } catch (e: any) {
            setPoints([]);
            setErr(e?.message ?? "Error cargando estadísticas");
        } finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        load();
    }, [mode, year, month]);

    const data = useMemo(() => {
        const map = new Map(points.map((p) => [p.day, p.incidents]));

        if (mode === "weekly") {
            const days = last7MadridDaysISO(); // siempre 7
            return days.map((day) => ({
                label: weekdayLabel(day),
                value: map.get(day) ?? 0,
            }));
        }

        const totalDays = daysInMonth(year, month);
        const mm = String(month + 1).padStart(2, "0");

        return Array.from({ length: totalDays }, (_, i) => {
            const dd = String(i + 1).padStart(2, "0");
            const iso = `${year}-${mm}-${dd}`;
            return {
                label: dd,
                value: map.get(iso) ?? 0,
            };
        });
    }, [points, mode, year, month]);


    return (
        <div className="bg-[#F5F4CB] rounded-md border border-emerald-900/20 p-4">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-emerald-950">Estadísticas</h2>

                <div className="flex gap-2">
                    <button
                        onClick={() => setMode("weekly")}
                        className={`px-3 py-1 rounded ${mode === "weekly" ? "bg-[#135B0A] text-white" : "bg-white/40"
                            }`}
                    >
                        Semanal
                    </button>
                    <button
                        onClick={() => setMode("monthly")}
                        className={`px-3 py-1 rounded ${mode === "monthly" ? "bg-[#135B0A] text-white" : "bg-white/40"
                            }`}
                    >
                        Mensual
                    </button>
                </div>
            </div>

            {/* MONTH NAV */}
            {mode === "monthly" && (
                <div className="flex items-center justify-center gap-4 mb-3">
                    <button
                        onClick={() =>
                            month === 0
                                ? (setMonth(11), setYear(year - 1))
                                : setMonth(month - 1)
                        }
                        className="px-3 py-1 rounded bg-white/40 hover:bg-white/60 active:bg-white/80 text-emerald-950 font-semibold transition"
                    >
                        ←
                    </button>

                    <span className="font-semibold text-emerald-950 capitalize">
                        {new Date(year, month).toLocaleDateString("es-ES", {
                            month: "long",
                            year: "numeric",
                        })}
                    </span>
                    <button
                        onClick={() =>
                            month === 11
                                ? (setMonth(0), setYear(year + 1))
                                : setMonth(month + 1)
                        }
                        className="px-3 py-1 rounded bg-white/40 hover:bg-white/60 active:bg-white/80 text-emerald-950 font-semibold transition"
                    >
                        →
                    </button>
                </div>
            )}

            {/* GRAPH */}
            {err ? <p className="text-sm text-red-700 mb-2">{err}</p> : null}

            {loading ? (
                <p className="text-sm text-emerald-900/70">Cargando…</p>
            ) : (
                <BarChart data={data} thinBars={mode === "monthly"} />
            )}

        </div>
    );
}
