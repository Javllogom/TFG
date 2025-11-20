'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

type Row = Record<string, string | number | boolean | null>;

export default function ResizableTable({
  columns,
  rows,
  minColWidth = 120,
}: {
  columns: string[];
  rows: Row[];
  minColWidth?: number;
}) {
  // Column widths
  const [widths, setWidths] = useState<number[]>(() => columns.map(() => 180));

  // Drag state
  const dragRef = useRef<{ col: number; startX: number; startW: number } | null>(null);

  // Scrollable wrapper (kept for layout; rails are anchored to the table itself)
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Table + TH refs to compute rail positions based on real DOM geometry
  const tableRef = useRef<HTMLTableElement | null>(null);
  const thRefs = useRef<(HTMLTableHeaderCellElement | null)[]>([]);
  const [handlerLefts, setHandlerLefts] = useState<number[]>([]);

  // Reset widths only when number of columns changes
  useEffect(() => {
    setWidths((prev) => (prev.length === columns.length ? prev : columns.map(() => 180)));
  }, [columns.length]);

  // Compute total width so the table can grow and enable horizontal scroll naturally
  const totalWidth = useMemo(() => widths.reduce((a, b) => a + b, 0), [widths]);

  // Start dragging a specific column border
  const startDrag = (i: number, e: React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    const clientX = (e as MouseEvent).clientX ?? (e as any).nativeEvent?.clientX;
    dragRef.current = { col: i, startX: clientX, startW: widths[i] };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Mouse move handler during drag
  const onMove = (e: MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    setWidths((w) => {
      const next = [...w];
      next[d.col] = Math.max(minColWidth, d.startW + dx);
      return next;
    });
  };

  // End drag
  const onUp = () => {
    dragRef.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  // Cleanup listeners if component unmounts mid-drag
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Support both dot.notation and snake_case lookup
  const lowerCols = useMemo(() => columns.map((c) => c.toLowerCase()), [columns]);
  const snakeCols = useMemo(() => columns.map((c) => c.toLowerCase().replace(/\./g, '_')), [columns]);

  // Recompute rail positions by measuring each <th> right edge relative to the table
  useEffect(() => {
    const tbl = tableRef.current;
    const ths = thRefs.current;
    if (!tbl || !ths.length) return;

    const compute = () => {
      const tRect = tbl.getBoundingClientRect();
      // rails for all but the last column
      const lefts = ths.slice(0, -1).map((th) => {
        if (!th) return 0;
        const r = th.getBoundingClientRect();
        // position relative to table's left — robust to horizontal scroll
        return r.right - tRect.left;
      });
      setHandlerLefts(lefts);
    };

    compute();
    // Recompute on window resize (scrollbars/fonts/layout changes)
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [columns, widths, rows.length]);

  return (
    <div
      ref={wrapRef}
      className="bb-scroll bb-table-wrap relative overflow-auto"
    >
      <table
        ref={tableRef}
        className="bb-table table-fixed border-collapse relative"
        style={{ minWidth: totalWidth }}
      >
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={`${col}-${i}`} // keep key unique even if column name repeats
                ref={(el) => { thRefs.current[i] = el; }} // store each <th> to measure its right edge
                className="sticky top-0 z-20 text-left text-white font-semibold border-y border-l border-r border-white bg-[#135B0A]"
                style={{ width: widths[i], padding: '6px 8px' }}
              >
                <div className="whitespace-nowrap overflow-hidden text-ellipsis">{col}</div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length > 0 ? (
            rows.map((entry, rIdx) => (
              <tr key={rIdx}>
                {columns.map((col, cIdx) => {
                  // locate by exact or snake_case (case-insensitive)
                  const key =
                    Object.keys(entry).find((k) => k.toLowerCase() === lowerCols[cIdx]) ??
                    Object.keys(entry).find((k) => k.toLowerCase() === snakeCols[cIdx]);

                  const val =
                    key !== undefined
                      ? (typeof entry[key] === 'string' ? entry[key] : String(entry[key] ?? ''))
                      : '';

                  return (
                    <td
                      key={`${col}-${cIdx}`} // ensure unique keys per cell
                      className={[
                        'text-white',
                        'border-l border-r border-white',
                        'border-b',
                        rIdx === 0 ? 'border-t-2' : 'border-t',
                        'px-2 py-1 align-top',
                        'whitespace-nowrap overflow-hidden text-ellipsis',
                      ].join(' ')}
                      style={{ width: widths[cIdx], maxWidth: widths[cIdx] }}
                      title={typeof val === 'string' ? val : undefined}
                    >
                      {val as string}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length || 1}
                className="text-center text-white/70 italic border-x border-y border-white px-2 py-2"
              >
                No matching events found
              </td>
            </tr>
          )}
        </tbody>

        {/* === Resize rails overlay (inside the table so it scrolls with content) === */}
        <div className="pointer-events-none absolute inset-0">
          {handlerLefts.map((left, i) => (
            <div
              key={`handler-${i}`}
              onMouseDown={(e) => startDrag(i, e as any)}
              className="absolute top-0 z-30 pointer-events-auto"
              style={{
                left: left - 3,  // center 6px rail on the border
                width: 6,
                height: '100%',
                background: 'transparent',
                cursor: 'col-resize',
              }}
              aria-hidden
            />
          ))}
        </div>
      </table>
    </div>
  );
}
