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

  // Scrollable wrapper
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Table + TH refs to compute rail positions
  const tableRef = useRef<HTMLTableElement | null>(null);
  const thRefs = useRef<(HTMLTableHeaderCellElement | null)[]>([]);
  const [handlerLefts, setHandlerLefts] = useState<number[]>([]);
  const [overlayHeight, setOverlayHeight] = useState<number>(0);

  // Reset widths only when number of columns changes
  useEffect(() => {
    setWidths(prev => (prev.length === columns.length ? prev : columns.map(() => 180)));
  }, [columns.length]);

  // Total width to allow horizontal scroll
  const totalWidth = useMemo(() => widths.reduce((a, b) => a + b, 0), [widths]);

  // Start dragging a specific column border
  const startDrag = (i: number, e: React.MouseEvent | MouseEvent) => {
    e.preventDefault(); // prevent text selection during drag
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
    setWidths(w => {
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
    // After drag, recompute rails in case widths changed a lot
    computeRails();
  };

  // Cleanup listeners if component unmounts mid-drag
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Support both dot.notation and snake_case lookup
  const lowerCols = useMemo(() => columns.map(c => c.toLowerCase()), [columns]);
  const snakeCols = useMemo(() => columns.map(c => c.toLowerCase().replace(/\./g, '_')), [columns]);

  // Compute rails: place each rail at right edge of <th> minus current scrollLeft of wrapper
  const computeRails = () => {
    const tbl = tableRef.current;
    const wrap = wrapRef.current;
    const ths = thRefs.current;
    if (!tbl || !wrap || !ths.length) return;

    const scroll = wrap.scrollLeft;
    const lefts = ths.slice(0, -1).map(th => {
      if (!th) return 0;
      // right edge within the table (offsetLeft is relative to the table)
      const rightInTable = th.offsetLeft + th.offsetWidth;
      // position inside the wrapper viewport (table scrolls horizontally)
      return rightInTable - scroll;
    });

    setHandlerLefts(lefts);
    setOverlayHeight(tbl.offsetHeight);
  };

  // Recompute rails on first render, width changes, row count changes, and table resize
  useEffect(() => {
    computeRails();
  }, [columns, widths, rows.length]);

  // Recompute on horizontal scroll and window resize
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onScroll = () => computeRails();
    wrap.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => computeRails();
    window.addEventListener('resize', onResize);
    return () => {
      wrap.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="bb-scroll bb-table-wrap relative overflow-auto"
    >
      <table
        ref={tableRef}
        className="bb-table table-fixed border-collapse"
        style={{ minWidth: totalWidth }}
      >
        {/* make the whole header row sticky instead of each <th> */}
        <thead className="sticky top-0 z-20 bg-[#135B0A] border-y border-white">
          <tr>
            {columns.map((col, i) => (
              <th
                key={`${col}-${i}`}
                ref={(el) => { thRefs.current[i] = el; }}
                className="text-left text-white font-semibold border-b border-l border-r border-white bg-[#135B0A]"
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
                  const k =
                    Object.keys(entry).find(k => k.toLowerCase() === lowerCols[cIdx]) ??
                    Object.keys(entry).find(k => k.toLowerCase() === snakeCols[cIdx]);

                  const val =
                    k !== undefined
                      ? (typeof entry[k] === 'string' ? entry[k] : String(entry[k] ?? ''))
                      : '';

                  return (
                    <td
                      key={`${col}-${cIdx}`} // unique per cell
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
      </table>

      {/* === Resize rails overlay (sibling of table to avoid hydration issues) === */}
      <div
        className="pointer-events-none absolute left-0 top-0"
        style={{ height: overlayHeight, width: '100%' }}
      >
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
    </div>
  );
}
