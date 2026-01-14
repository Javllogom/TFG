"use client";

type Point = { label: string; value: number };

export default function LineChartBins({
  data,
}: {
  data: Point[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  const H = 240;
  const W = 920;
  const padLeft = 48;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 34;

  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const step = innerW / Math.max(data.length - 1, 1);

  function yFor(v: number) {
    return padTop + innerH - (v / max) * innerH;
  }

  function xFor(i: number) {
    return padLeft + i * step;
  }

  const yTicks = [0, Math.floor(max / 2), max].map((v, i) => ({ v, key: `${v}-${i}` }));

  const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.value), ...d }));

  const pathD =
    points.length <= 1
      ? ""
      : points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
          .join(" ");

  const tickEvery =
    data.length <= 8 ? 1 : data.length <= 16 ? 1 : data.length <= 31 ? 2 : 3;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-72">
      {/* Axes */}
      <line x1={padLeft} y1={padTop} x2={padLeft} y2={H - padBottom} stroke="#0f3f2e" strokeWidth="2" />
      <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom} stroke="#0f3f2e" strokeWidth="2" />

      {/* Y grid (dotted) + labels */}
      {yTicks.map(({ v, key }) => {
        const y = yFor(v);
        return (
          <g key={key}>
            <line
              x1={padLeft}
              y1={y}
              x2={W - padRight}
              y2={y}
              stroke="#0f3f2e"
              strokeWidth="1"
              strokeDasharray="4 6"
              opacity="0.35"
            />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="12" fill="#0f3f2e">
              {v}
            </text>
          </g>
        );
      })}

      {/* Line */}
      {pathD ? <path d={pathD} fill="none" stroke="#166534" strokeWidth="3" /> : null}

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="5" fill="#166534" />
      ))}

      {/* X labels (like your top style) */}
      {data.map((d, i) => {
        const showTick = i % tickEvery === 0 || i === data.length - 1;
        if (!showTick) return null;
        return (
          <text
            key={`x-${d.label}-${i}`}
            x={xFor(i)}
            y={H - 12}
            textAnchor="middle"
            fontSize="12"
            fill="#0f3f2e"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
