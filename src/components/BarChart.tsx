type Point = { label: string; value: number };

export default function BarChart({
  data,
  thinBars = false,
  xStep,
}: {
  data: Point[];
  thinBars?: boolean;
  xStep?: number; // 👈 controla cada cuántas labels se muestran (solo útil en monthly)
}) {
  const maxRaw = Math.max(...data.map((d) => d.value), 0);
  const max = Math.max(maxRaw, 1);

  const W = 900;
  const H = 300;

  const padLeft = 55;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 45;

  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const step = innerW / Math.max(data.length, 1);
  const barW = Math.max(1, (thinBars ? 0.55 : 0.75) * step);

  const ticksCount = 4;
  const ticks: number[] = [];
  for (let i = 0; i <= ticksCount; i++) {
    ticks.push(Math.round((max * i) / ticksCount));
  }

  function yFor(v: number) {
    return padTop + innerH - (v / max) * innerH;
  }

  function shouldShowXLabel(i: number) {
    // Semanal: muestra todas
    if (!thinBars) return true;

    // Mensual: si viene xStep, úsalo (ej: 2 => muestra 01,03,05,...)
    if (xStep && xStep > 0) return i % xStep === 0;

    // fallback (por si no pasas xStep): 1, 5, 10, 15, 20, 25, último
    const n = i + 1;
    const last = data.length;
    if (n === 1 || n === last) return true;
    if (n % 5 === 0) return true;
    return false;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-72">
      {/* Axes */}
      <line
        x1={padLeft}
        y1={padTop}
        x2={padLeft}
        y2={H - padBottom}
        stroke="#0f3f2e"
        strokeWidth="2"
      />
      <line
        x1={padLeft}
        y1={H - padBottom}
        x2={W - padRight}
        y2={H - padBottom}
        stroke="#0f3f2e"
        strokeWidth="2"
      />

      {/* Horizontal grid + Y labels */}
      {Array.from(new Set(ticks)).map((v, idx) => (
        <g key={`${v}-${idx}`}>
          <text
            x={padLeft - 8}
            y={yFor(v) + 4}
            textAnchor="end"
            fontSize="12"
            fill="#0f3f2e"
          >
            {v}
          </text>

          <line
            x1={padLeft}
            y1={yFor(v)}
            x2={W - padRight}
            y2={yFor(v)}
            stroke="#0f3f2e"
            strokeDasharray="5 6"
            opacity={0.25}
          />
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const x = padLeft + i * step + (step - barW) / 2;
        const y = yFor(d.value);
        const h = H - padBottom - y;

        return (
          <g key={`${d.label}-${i}`}>
            {/* dotted guide line for THIS bar value */}
            {d.value > 0 ? (
              <line
                x1={padLeft}
                y1={y}
                x2={x}
                y2={y}
                stroke="#166534"
                strokeDasharray="4 6"
                opacity={0.6}
              />
            ) : null}

            <rect x={x} y={y} width={barW} height={h} fill="#166534" rx={2} />

            {/* Value label on top for weekly */}
            {!thinBars && d.value > 0 ? (
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="12"
                fill="#0f3f2e"
              >
                {d.value}
              </text>
            ) : null}

            {/* X labels */}
            {shouldShowXLabel(i) ? (
              <text
                x={x + barW / 2}
                y={H - 15}
                textAnchor="middle"
                fontSize={thinBars ? "10" : "12"}
                fill="#0f3f2e"
              >
                {d.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
