"use client";

type Point = { label: string; value: number };

export default function BarChartHours({
  data,
  height = 240,
}: {
  data: Point[];
  height?: number;
}) {
  const W = 920;
  const H = height;
  const padL = 48;
  const padR = 16;
  const padT = 18;
  const padB = 34;

  const max = Math.max(...data.map((d) => d.value), 1);
  const ticks = [0, Math.floor(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const slot = innerW / data.length;
  const barW = Math.max(6, slot * 0.65);

  const xFor = (i: number) => padL + i * slot + (slot - barW) / 2;
  const yFor = (v: number) => padT + innerH * (1 - v / max);
  const hFor = (v: number) => innerH * (v / max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px]">
      {/* axes */}
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#0f3f2e" strokeWidth="2" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#0f3f2e" strokeWidth="2" />

      {/* y grid */}
      {ticks.map((v) => (
        <g key={`y-${v}`}>
          <line
            x1={padL}
            y1={yFor(v)}
            x2={W - padR}
            y2={yFor(v)}
            stroke="#0f3f2e"
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.35"
          />
          <text x={padL - 8} y={yFor(v) + 4} textAnchor="end" fontSize="11" fill="#0f3f2e" opacity="0.8">
            {v}
          </text>
        </g>
      ))}

      {/* bars */}
      {data.map((d, i) => {
        const x = xFor(i);
        const h = hFor(d.value);
        const y = yFor(d.value);

        return (
          <g key={`b-${d.label}-${i}`}>
            <rect x={x} y={y} width={barW} height={h} rx="3" fill="#166534" />
          </g>
        );
      })}

      {/* x labels (every 2 hours for readability) */}
      {data.map((d, i) => {
        if (i % 2 !== 0) return null;
        const x = xFor(i) + barW / 2;
        return (
          <text key={`x-${i}`} x={x} y={H - 10} textAnchor="middle" fontSize="11" fill="#0f3f2e" opacity="0.9">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
