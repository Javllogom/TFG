'use client';
import Link from 'next/link';

function badgeColor(count: number) {
  if (count === 0) return '#FEFEFE';
  if (count <= 2) return '#F6F39F';
  if (count <= 5) return '#FDB994';
  if (count <= 9) return '#D89191';
  return '#E07B7B';
}

export default function BinCard({
  name,
  count,
  href,
}: {
  name: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl px-4 py-3 transition border-2"
      style={{
        backgroundColor: '#166534',
        borderColor: '#135B0A',
        color: '#FFFFFF',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center rounded-lg w-8 h-8 text-xs font-mono"
          style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
          aria-hidden
        >
          exe
        </span>
        <span className="font-bold text-lg">{name}</span>
      </div>

      <span
        className="inline-flex items-center justify-center rounded-full w-9 h-9 font-bold"
        style={{
          backgroundColor: badgeColor(count),
          color: '#000000', // números en negro
        }}
        aria-label={`Incidencias: ${count}`}
      >
        {count}
      </span>
    </Link>
  );
}
