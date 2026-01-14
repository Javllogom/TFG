"use client";

import { useMemo } from "react";

type Item = { name: string; count: number };

const PALETTE = ["#166534", "#0f766e", "#1d4ed8", "#7c3aed", "#b45309", "#be123c"];
const OTHERS_COLOR = "#9ca3af";

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function donutPath(cx: number, cy: number, rO: number, rI: number, start: number, end: number) {
  const large = end - start > 180 ? 1 : 0;

  const p1 = polar(cx, cy, rO, end);
  const p2 = polar(cx, cy, rO, start);
  const p3 = polar(cx, cy, rI, start);
  const p4 = polar(cx, cy, rI, end);

  return [
    `M ${p2.x} ${p2.y}`,
    `A ${rO} ${rO} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p4.x} ${p4.y}`,
    `A ${rI} ${rI} 0 ${large} 0 ${p3.x} ${p3.y}`,
    "Z",
  ].join(" ");
}

export default function DonutIncidents({
  items,
  title = "Distribución por binario",
}: {
  items: Item[];
  title?: string;
}) {
  const threshold = 0.09; // interno, NO se muestra

  const { total, slices, legend } = useMemo(() => {
    const clean = (items ?? [])
      .map((i) => ({ name: String(i.name), count: Number(i.count ?? 0) }))
      .filter((i) => Number.isFinite(i.count) && i.count >= 0);

    const totalCount = clean.reduce((a, b) => a + b.count, 0);
    if (totalCount <= 0) return { total: 0, slices: [] as any[], legend: [] as any[] };

    const majors: Item[] = [];
    let othersCount = 0;

    for (const it of clean) {
      const pct = it.count / totalCount;
      if (pct >= threshold) majors.push(it);
      else othersCount += it.count;
    }

    const final: Item[] = [...majors];
    if (othersCount > 0) final.push({ name: "Otros", count: othersCount });

    // ordenar por count desc (Otros al final)
    const ordered = final
      .filter((x) => x.name !== "Otros")
      .sort((a, b) => b.count - a.count);
    if (othersCount > 0) ordered.push({ name: "Otros", count: othersCount });

    const legendRows = ordered.map((s, idx) => {
      const isOthers = s.name === "Otros";
      const color = isOthers ? OTHERS_COLOR : PALETTE[idx % PALETTE.length];
      return { ...s, color, pct: (s.count / totalCount) * 100 };
    });

    let acc = 0;
    const slicesBuilt = legendRows.map((s) => {
      const startAngle = acc * 360;
      acc += s.count / totalCount;
      const endAngle = acc * 360;
      return { ...s, startAngle, endAngle, angleSpan: endAngle - startAngle };
    });

    return { total: totalCount, slices: slicesBuilt, legend: legendRows };
  }, [items]);

  const W = 920;
  const H = 340;
  const cx = 210;
  const cy = 175;
  const rOuter = 110;
  const rInner = 70;

  return (
    <div className="bg-[#F5F4CB] rounded-md border border-emerald-900/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-emerald-950">{title}</h3>
        <span className="text-xs text-emerald-950/70">Total: {total}</span>
      </div>

      {total <= 0 ? (
        <p className="text-sm text-emerald-900/70">No hay datos todavía.</p>
      ) : (
        <div className="flex gap-6 items-center">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[300px]">
            {/* slices */}
            {slices.map((s, idx) => (
              <path
                key={`${s.name}-${idx}`}
                d={donutPath(cx, cy, rOuter, rInner, s.startAngle, s.endAngle)}
                fill={s.color}
                opacity={0.95}
              />
            ))}

            {/* center */}
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill="#0f3f2e">
              Incidencias
            </text>
            <text
              x={cx}
              y={cy + 20}
              textAnchor="middle"
              fontSize="26"
              fontWeight="700"
              fill="#0f3f2e"
            >
              {total}
            </text>
            {/* labels outside (always) */}
            {slices.map((s, idx) => {
              const mid = (s.startAngle + s.endAngle) / 2;

              const p1 = polar(cx, cy, rOuter + 2, mid);
              const p2 = polar(cx, cy, rOuter + 22, mid);

              const rightSide = p2.x >= cx;
              const anchor = rightSide ? "start" : "end";
              const textX = p2.x + (rightSide ? 10 : -10);

              // Slight vertical nudge helps readability
              const textY1 = p2.y - 3;
              const textY2 = p2.y + 12;

              return (
                <g key={`lbl-${s.name}-${idx}`}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={s.color}
                    strokeDasharray="3 5"
                    opacity={0.9}
                  />
                  <text
                    x={textX}
                    y={textY1}
                    textAnchor={anchor}
                    fontSize="11"
                    fill="#0f3f2e"
                    fontWeight="700"
                  >
                    {s.name}
                  </text>
                  <text
                    x={textX}
                    y={textY2}
                    textAnchor={anchor}
                    fontSize="11"
                    fill="#0f3f2e"
                  >
                    {s.count}
                  </text>
                </g>
              );
            })}

            {/* legend block (right side) */}
            <g transform={`translate(470, 70)`}>
              {legend.map((l, i) => (
                <g key={l.name} transform={`translate(0, ${i * 26})`}>
                  <rect x={0} y={-10} width={12} height={12} rx={3} fill={l.color} />
                  <text x={18} y={0} fontSize="12" fill="#0f3f2e" fontWeight="700">
                    {l.name}
                  </text>
                  <text x={240} y={0} fontSize="12" fill="#0f3f2e" textAnchor="end" fontWeight="700">
                    {l.count}
                  </text>
                  <text x={290} y={0} fontSize="12" fill="#0f3f2e" textAnchor="end" opacity={0.75}>
                    ({l.pct.toFixed(1)}%)
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}
