'use client';

import { useEffect, useState } from "react";
import BinCard from "@/components/BinCard";

type BinItem = {
  desc: string;
  name: string;
  count: number;
  href: string;
};

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
  const [view, setView] = useState<ViewMode>("two");
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    setAnimateKey((k) => k + 1);
  }, [view]);

  if (!items?.length) {
    return <p className="px-6 text-emerald-900/80">No se encontraron binarios.</p>;
  }

  const gridCols =
    view === "one"
      ? "grid-cols-1"
      : view === "two"
      ? "grid-cols-1 md:grid-cols-2"
      : "grid-cols-2 md:grid-cols-4";

  const variant = view === "four" ? "compact" : "wide";

  return (
    <section className="max-w-7xl mx-auto px-4 pb-10">
      <div className="flex justify-end gap-2 mb-3">
        {(["one", "two", "four"] as ViewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setView(m)}
            className={[
              "rounded-lg px-2 py-2 border shadow-sm transition",
              view === m
                ? "bg-[#0B3D06] border-[#F5F4CB]/70"
                : "bg-[#135B0A] border-[#F5F4CB]/40 hover:bg-[#0f3f0a]",
            ].join(" ")}
            aria-label={`Vista ${m}`}
            title={`Vista ${m}`}
          >
            <ViewIcon mode={m} active={view === m} />
          </button>
        ))}
      </div>

      <div
        key={animateKey}
        className={[
          "grid gap-4",
          gridCols,
          "transition-all duration-300 ease-out",
        ].join(" ")}
      >
        {items.map((b, i) => (
          <div
            key={`${b.name}-${animateKey}`}
            className="opacity-0 translate-y-2 animate-[bbIn_260ms_ease-out_forwards]"
            style={{ animationDelay: `${i * 18}ms` }}
          >
            <BinCard
              name={b.name}
              count={b.count}
              href={b.href}
              variant={variant as any}
              {...(view === "one" ? { description: b.desc } : {})}
            />
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes bbIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
