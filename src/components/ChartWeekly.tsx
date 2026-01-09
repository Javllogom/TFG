// src/components/ChartWeekly.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type WeeklyApiPoint = { day: string; incidents: number };
type WeeklyApiResponse = { ok: boolean; points?: WeeklyApiPoint[]; error?: string };

type Point = {
  day: string;
  label: string;
  value: number;
};

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

function last7MadridDays(): string[] {
  const base = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    return madridDayISO(d);
  });
}

export default function ChartWeekly({
  title = "Estadísticas Semanales",
  totalIncidents,
}: {
  title?: string;
  totalIncidents: number;
}) {
  const [apiPoints, setApiPoints] = useState<WeeklyApiPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/metrics/weekly", { cache: "no-store" });
    const data = (await res.json()) as WeeklyApiResponse;
    setApiPoints(data.points ?? []);
    setLoading(false);
  }

  async function recordToday() {
    setRecording(true);
    await fetch("/api/metrics/record-today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ incidents: totalIncidents }),
    });
    await load();
    setRecording(false);
  }

  useEffect(() => {
    load();
  }, []);

  /* ===== Construcción de datos ===== */
  const points: Point[] = useMemo(() => {
    const map = new Map(apiPoints.map((p) => [p.day, p.incidents]));
    const days = last7MadridDays().reverse();
    // 👆 ahora el último es HOY

    return days.map((day) => ({
      day,
      label: weekdayLabel(day),
      value: map.get(day) ?? 0,
    }));
  }, [apiPoints]);


  const max = Math.max(...points.map((p) => p.value), 1);

  /* ===== Layout ===== */
  const H = 240;
  const W = 520;
  const padLeft = 45;
  const padBottom = 35;
  const padTop = 15;
  const barAreaH = H - padBottom - padTop;
  const barW = (W - padLeft - 20) / points.length - 10;

  function yFor(v: number) {
    return padTop + barAreaH - (v / max) * barAreaH;
  }

  return (
    <div className="bg-[#F5F4CB] rounded-md border border-emerald-900/20 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-emerald-900">{title}</h3>

        <button
          onClick={recordToday}
          disabled={recording}
          className="rounded-lg bg-[#135B0A] text-[#F5F4CB] px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
        >
          {recording ? "Registrando…" : "Recordar hoy"}
        </button>
      </div>

      {loading && <p className="text-sm text-emerald-900/70 mb-2">Cargando…</p>}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-64">
        {/* Eje Y */}
        <line
          x1={padLeft}
          y1={padTop}
          x2={padLeft}
          y2={H - padBottom}
          stroke="#0f3f2e"
          strokeWidth="2"
        />

        {/* Eje X */}
        <line
          x1={padLeft}
          y1={H - padBottom}
          x2={W - 10}
          y2={H - padBottom}
          stroke="#0f3f2e"
          strokeWidth="2"
        />

        {/* Ticks Y */}
        {Array.from(new Set([0, Math.floor(max / 2), max])).map((v) => (
          <g key={v}>
            <text
              x={padLeft - 6}
              y={yFor(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#0f3f2e"
            >
              {v}
            </text>
            <line
              x1={padLeft}
              y1={yFor(v)}
              x2={W - 10}
              y2={yFor(v)}
              stroke="#0f3f2e"
              strokeDasharray="4 4"
              opacity={0.3}
            />
          </g>
        ))}

        {/* Barras */}
        {points.map((p, i) => {
          const x = padLeft + i * (barW + 10) + 10;
          const y = yFor(p.value);
          const h = H - padBottom - y;

          return (
            <g key={p.day}>
              {/* Línea punteada hasta la barra */}
              <line
                x1={padLeft}
                y1={y}
                x2={x}
                y2={y}
                stroke="#166534"
                strokeDasharray="4 4"
                opacity={0.6}
              />

              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                fill="#166534"
                rx={2}
              />

              <text
                x={x + barW / 2}
                y={H - 10}
                textAnchor="middle"
                fontSize="12"
                fill="#0f3f2e"
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
