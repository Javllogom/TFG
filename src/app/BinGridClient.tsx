"use client";

import { useEffect, useMemo, useState } from "react";
import BinCard from "@/components/BinCard";

type BinItem = { name: string; count: number; href: string };

type ViewMode = "one" | "two" | "four";

function ViewIcon({ mode, active }: { mode: ViewMode; active: boolean }) {
    const cls = active ? "text-[#F5F4CB]" : "text-[#F5F4CB]/70";
    const common = "w-4 h-4";
    if (mode === "one") {
        return (
            <svg viewBox="0 0 24 24" className={`${common} ${cls}`} aria-hidden="true">
                <rect x="4" y="7" width="16" height="10" rx="2" fill="currentColor" />
            </svg>
        );
    }
    if (mode === "two") {
        return (
            <svg viewBox="0 0 24 24" className={`${common} ${cls}`} aria-hidden="true">
                <rect x="4" y="7" width="7.5" height="10" rx="2" fill="currentColor" />
                <rect x="12.5" y="7" width="7.5" height="10" rx="2" fill="currentColor" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" className={`${common} ${cls}`} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => {
                const r = Math.floor(i / 4);
                const c = i % 4;
                return (
                    <rect
                        key={i}
                        x={4 + c * 4.2}
                        y={6.5 + r * 5.5}
                        width="3.3"
                        height="4.2"
                        rx="1"
                        fill="currentColor"
                    />
                );
            })}
        </svg>
    );
}

export default function BinGridClient({ items }: { items: BinItem[] }) {
    const [mode, setMode] = useState<ViewMode>("two");

    useEffect(() => {
        const saved = window.localStorage.getItem("binboard:viewMode") as ViewMode | null;
        if (saved === "one" || saved === "two" || saved === "four") setMode(saved);
    }, []);

    const setAndPersist = (m: ViewMode) => {
        setMode(m);
        window.localStorage.setItem("binboard:viewMode", m);
    };

    const gridClass = useMemo(() => {
        if (mode === "one") return "grid grid-cols-1 gap-5";
        if (mode === "four") return "grid grid-cols-2 md:grid-cols-4 gap-3";
        return "grid grid-cols-1 md:grid-cols-2 gap-5";
    }, [mode]);

    return (
        <section className="max-w-7xl mx-auto px-4 pb-10">
            <div className="flex items-center justify-end mb-3">
                <div className="inline-flex items-center gap-1 bg-[#135B0A] border border-emerald-950/40 rounded-full p-1 shadow-sm">
                    {(["one", "two", "four"] as ViewMode[]).map((m) => {
                        const active = mode === m;
                        return (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setAndPersist(m)}
                                className={[
                                    "rounded-full px-2.5 py-2 transition flex items-center justify-center",
                                    active ? "bg-[#0B3D06]" : "bg-transparent hover:bg-[#0B3D06]/60",
                                ].join(" ")}
                                aria-label={
                                    m === "one" ? "Vista 1 por fila" : m === "two" ? "Vista 2 por fila" : "Vista 4 por fila"
                                }
                            >
                                <ViewIcon mode={m} active={active} />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={gridClass}>
                {items.map((b) => (
                    <div key={b.name}>
                        <BinCard
                            name={b.name}
                            count={b.count}
                            href={b.href}
                            variant={mode === "one" ? "wide" : mode === "four" ? "compact" : "default"}
                            description={
                                mode === "one"
                                    ? "Texto provisional: descripción breve del binario y su posible abuso."
                                    : undefined
                            }
                        />
                    </div>
                ))}

            </div>

            {items.length === 0 && (
                <div className="text-center text-emerald-900/80 mt-8">
                    No se han encontrado binarios en <code>rules</code>.
                </div>
            )}
        </section>
    );
}
