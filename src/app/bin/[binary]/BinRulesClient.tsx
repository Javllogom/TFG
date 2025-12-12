"use client";

import { useState } from "react";
import RuleCard from "@/components/RuleCard";

type RuleRow = {
    id?: string;
    binary: string;
    title: string;
    rule: string;
    description: string;
    link: string;
    columns: string[];
    binary_raw?: string;
    title_raw?: string;
};

type TrafficRow = Record<string, unknown>;

function EyeOpen({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path
                d="M3 12c1.5-3.5 4.9-6 9-6s7.5 2.5 9 6c-1.5 3.5-4.9 6-9 6s-7.5-2.5-9-6z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle
                cx="12"
                cy="12"
                r="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
        </svg>
    );
}

function EyeClosed({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {/* contorno del ojo */}
      <path
        d="M3 12c1.5-3.5 4.9-6 9-6s7.5 2.5 9 6c-1.5 3.5-4.9 6-9 6s-7.5-2.5-9-6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* iris */}
      <circle
        cx="12"
        cy="12"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
      />

      {/* línea diagonal ligeramente más corta */}
      <path
        d="M3 3 L21 21"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}



export default function BinRulesClient({
    binary,
    rules,
    traffic,
}: {
    binary: string;
    rules: RuleRow[];
    traffic: TrafficRow[];
}) {
    const [showEmpty, setShowEmpty] = useState(true);

    const hasRules = rules.length > 0;

    return (
        <>
            {/* cabecera: título centrado + botón a la derecha */}
            <div className="relative mb-8">
                <h1 className="text-5xl font-extrabold text-emerald-900 underline text-center">
                    {binary}
                </h1>

                <button
                    type="button"
                    onClick={() => setShowEmpty((v) => !v)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 rounded-full px-3 py-2 bg-[#135B0A] text-white border border-[#F5F4CB]/60 shadow-sm hover:bg-[#0f3f0a] active:bg-[#0b3207] transition"
                    title={showEmpty ? "Hide rules with no matching events" : "Show rules with no matching events"}
                >
                    {showEmpty ? (
                        <EyeOpen className="w-5 h-5 text-white" />
                    ) : (
                        <EyeClosed className="w-5 h-5 text-white" />
                    )}

                    <span className="text-sm font-semibold hidden sm:inline text-white">
                        {showEmpty ? "Ocultar vacíos" : "Mostrar vacíos"}
                    </span>
                </button>

            </div>

            {!hasRules ? (
                <p className="text-center text-emerald-900/80">
                    No hay reglas para <strong>{binary}</strong> en <code>rules</code>.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rules.map((rule, idx) => (
                        <RuleCard
                            key={idx}
                            initialRule={{
                                id: rule.id,
                                binary: rule.binary,
                                title: rule.title,
                                rule: rule.rule,
                                description: rule.description ?? "",
                                columns: Array.isArray(rule.columns)
                                    ? rule.columns
                                    : (rule as any).columns,
                                matchBinary: (rule as any).binary_raw ?? rule.binary,
                                matchTitle: (rule as any).title_raw ?? rule.title,
                            }}
                            allRows={traffic as any[]}
                            showEmpty={showEmpty}
                        />
                    ))}
                </div>
            )}
        </>
    );
}
