"use client";

import { useMemo } from "react";

type Point = { label: string; value: number };

export default function LineChart({
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

  const xFor = (i: number) => {
    const inner = W - padL - padR;
    return padL + (inner * i) / Math.max(data.length - 1, 1);
  };

  const yFor = (v: number) => {
    const inner = H - padT - padB;
    return padT + inner * (1 - v / max);
  };

  const pathD = useMemo(() => {
    if (data.length === 0) return "";
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(d.value)}`)
      .join(" ");
  }, [data, max]);

  const ticks = [0, Math.floor(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px]">
      {/* axes */}
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#0f3f2e" strokeWidth="2" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#0f3f2e" strokeWidth="2" />

      {/* y grid */}
      {ticks.map((v) => (
        <g key={`t-${v}`}>
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

      {/* line */}
      <path d={pathD} fill="none" stroke="#166534" strokeWidth="3" />

      {/* points + vertical dotted helper */}
      {data.map((d, i) => (
        <g key={`${d.label}-${i}`}>
          <line
            x1={xFor(i)}
            y1={H - padB}
            x2={xFor(i)}
            y2={yFor(d.value)}
            stroke="#166534"
            strokeDasharray="2 6"
            opacity="0.25"
          />
          <circle cx={xFor(i)} cy={yFor(d.value)} r="4" fill="#166534" />
        </g>
      ))}

      {/* x labels (reduce density if many points) */}
      {data.map((d, i) => {
        const step = data.length > 31 ? 3 : data.length > 14 ? 2 : 1;
        if (i % step !== 0 && i !== data.length - 1) return null;

        return (
          <text
            key={`x-${i}`}
            x={xFor(i)}
            y={H - 10}
            textAnchor="middle"
            fontSize="11"
            fill="#0f3f2e"
            opacity="0.9"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
