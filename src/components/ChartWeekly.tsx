// src/components/ChartWeekly.tsx
'use client';
type Point = { label: string; value: number };

export default function ChartWeekly({
  data = [
    { label: 'Lun', value: 12 },
    { label: 'Mar', value: 18 },
    { label: 'Mié', value: 9 },
    { label: 'Jue', value: 14 },
    { label: 'Vie', value: 2 },
    { label: 'Sáb', value: 22 },
    { label: 'Dom', value: 17 },
  ],
  title = 'Estadísticas Semanales',
}: { data?: Point[]; title?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const H = 220;
  const W = 520;
  const pad = 30;
  const barW = (W - pad * 2) / data.length - 10;

  return (
    <div className="bg-[#F5F4CB] rounded-md border border-emerald-900/20 p-4">
      <h3 className="text-center font-semibold text-emerald-900 mb-2">{title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-64">
        {/* eje Y */}
        <line x1={pad} y1={10} x2={pad} y2={H - 30} stroke="#0f3f2e" strokeWidth="2" />
        {/* eje X */}
        <line x1={pad} y1={H - 30} x2={W - 10} y2={H - 30} stroke="#0f3f2e" strokeWidth="2" />
        {data.map((d, i) => {
          const x = pad + i * ((W - pad * 2) / data.length) + 5;
          const h = (d.value / max) * (H - 60);
          const y = H - 30 - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} fill="#166534" />
              <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="12" fill="#0f3f2e">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
