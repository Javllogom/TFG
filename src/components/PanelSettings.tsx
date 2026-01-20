'use client';
/* Drawer to edit a rule/panel (title, rule, description, link, columns) */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { updateRuleInDb } from "@/app/bin/[binary]/actions";
import { updatePanelInDb } from "@/app/create/panel/actions"; // 👈 AJUSTA si tu ruta es distinta
import AccessDeniedModal from "@/components/AccessDeniedModal";
import { useMe } from "@/lib/useMe";

type Mode = "rule" | "panel";

type RuleEditable = {
  id?: string | null;
  binary: string;         // UI value (trimmed)
  title: string;          // UI value (trimmed)
  rule: string;
  description?: string | null;
  link?: string | null;
  columns: string[];
  // exact DB-match values (untrimmed)
  matchBinary: string;
  matchTitle: string;
};

type PanelEditable = {
  id: string;             // 👈 en panels siempre hay id
  title: string;
  rule: string;
  description?: string | null;
  link?: string | null;
  columns: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  initial: RuleEditable | PanelEditable;
  onSaved?: (updated: any) => void;
  availableColumns?: string[];
  mode?: Mode; // 👈 NUEVO
};

function isRuleEditable(x: RuleEditable | PanelEditable): x is RuleEditable {
  return (x as any).matchBinary !== undefined && (x as any).matchTitle !== undefined;
}

export default function RuleSettings({
  open,
  onClose,
  initial,
  onSaved,
  availableColumns = [],
  mode = "rule",
}: Props) {
  const [title, setTitle] = useState((initial as any).title ?? '');
  const [rule, setRule] = useState((initial as any).rule ?? '');
  const [description, setDescription] = useState((initial as any).description ?? '');
  const [link, setLink] = useState((initial as any).link ?? '');
  const [columns, setColumns] = useState<string[]>(() =>
    Array.isArray((initial as any).columns) ? (initial as any).columns : []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAdmin, loading } = useMe();
  const [denyOpen, setDenyOpen] = useState(false);

  useEffect(() => {
    if (open && !loading && !isAdmin) {
      setDenyOpen(true);
      onClose();
    }
  }, [open, loading, isAdmin, onClose]);

  // --- drag & drop reordering for columns ---
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const allowDragRef = useRef(false);

  function allowDragFromHandle() {
    allowDragRef.current = true;
  }

  function onDragStart(idx: number, e: React.DragEvent<HTMLDivElement>) {
    if (!allowDragRef.current) {
      e.preventDefault();
      return;
    }
    allowDragRef.current = false;
    setDragIdx(idx);

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    }
  }

  function onDragOver(idx: number, e: React.DragEvent<HTMLDivElement>) {
    if (dragIdx === null || dragIdx === idx) return;
    e.preventDefault();

    setColumns(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });

    setDragIdx(idx);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragIdx(null);
  }

  function onDragEnd() {
    setDragIdx(null);
  }

  const takenSet = useMemo(() => {
    return new Set((columns ?? []).map(c => String(c ?? '').trim()).filter(Boolean));
  }, [columns]);

  function optionsForIndex(idx: number) {
    const current = String(columns[idx] ?? '').trim();
    return (availableColumns ?? []).filter(opt => !takenSet.has(opt) || opt === current);
  }

  function firstUnusedOption() {
    return (availableColumns ?? []).find(opt => !takenSet.has(opt));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Reset local state when opening
  useEffect(() => {
    if (open) {
      setTitle((initial as any).title ?? '');
      setRule((initial as any).rule ?? '');
      setDescription((initial as any).description ?? '');
      setLink((initial as any).link ?? '');
      setColumns(Array.isArray((initial as any).columns) ? (initial as any).columns : []);
      setError(null);
    }
  }, [open, initial]);

  function addColumn() {
    const next = firstUnusedOption();
    if (!next) return;
    setColumns((prev) => [...prev, next]);
  }

  function removeColumn(idx: number) {
    setColumns((prev) => prev.filter((_, i) => i !== idx));
  }
  function setColumn(idx: number, val: string) {
    setColumns((prev) => prev.map((c, i) => (i === idx ? val : c)));
  }

  async function handleSave() {
    if (!isAdmin) {
      setError("Acceso denegado.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: title.trim(),
        rule: rule.trim(),
        description: (description ?? '').trim(),
        link: (link ?? '').trim(),
        columns: columns.map((c) => c.trim()).filter(Boolean),
      };

      if (mode === "panel") {
        const p = initial as PanelEditable;

        const updated = await updatePanelInDb(payload, { id: p.id });

        if (!updated) throw new Error("No rows were updated (panel).");

        onSaved?.({
          ...p,
          ...payload,
        });
      } else {
        if (!isRuleEditable(initial)) {
          throw new Error("RuleSettings: initial no contiene matchBinary/matchTitle para modo rule.");
        }

        const updated = await updateRuleInDb(payload, {
          id: initial.id ?? undefined,
          matchBinary: initial.matchBinary,
          matchTitle: initial.matchTitle,
        });

        if (!updated) {
          throw new Error('No rows were updated (check matchBinary/matchTitle).');
        }

        onSaved?.({
          ...initial,
          ...payload,
        });
      }

      onClose();
    } catch (e: any) {
      const msg = e?.message ?? "Save failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  // Prevent scroll bleed when open
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-full max-w-[560px] bg-[#0f4c0d] text-white shadow-2xl border-r border-emerald-900
          transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col h-full`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/15">
          <h2 className="text-2xl font-bold"> {(initial as any).title || 'Ajustes'} </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10 active:bg-white/20 cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-28">
          <section>
            <h3 className="text-[15px] font-semibold mb-2">Título</h3>
            <input
              className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-[#F5F4CB] outline-none placeholder:text-emerald-900/50 shadow-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título"
            />
          </section>

          <section>
            <h3 className="text-[15px] font-semibold mb-2">Regla</h3>
            <textarea
              className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-[#F5F4CB] outline-none min-h-[120px] resize-vertical shadow-sm"
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              placeholder={`process.name : "bitsadmin.exe" and ...`}
            />
          </section>

          <section>
            <h3 className="text-[15px] font-semibold mb-2">Descripción</h3>
            <textarea
              className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-[#F5F4CB] outline-none min-h-[90px] resize-vertical shadow-sm"
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica qué detecta esta regla."
            />
          </section>

          {/* 👇 Link */}
          <section>
            <h3 className="text-[15px] font-semibold mb-2">Link (opcional)</h3>
            <input
              className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-[#F5F4CB] outline-none placeholder:text-emerald-900/50 shadow-sm"
              value={link ?? ''}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </section>

          <section>
            <h3 className="text-[15px] font-semibold mb-2">Columnas</h3>

            <div className="space-y-3">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => onDragStart(idx, e)}
                  onDragOver={(e) => onDragOver(idx, e)}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                  className={[
                    "flex items-center gap-2",
                    "transform transition-transform transition-shadow transition-colors duration-150 ease-out",
                    dragIdx === idx
                      ? "ring-2 ring-emerald-400/70 rounded-xl opacity-80 scale-[0.98] shadow-lg"
                      : "",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onMouseDown={allowDragFromHandle}
                    className="w-8 h-8 shrink-0 grid place-items-center text-emerald-900/90 bg-[#F5F4CB] rounded-lg cursor-grab active:cursor-grabbing"
                    title="Arrastrar para reordenar"
                    aria-label="Arrastrar para reordenar"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M5 8h14M5 12h14M5 16h14" stroke="#135B0A" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>

                  <div className="flex-1 bg-[#F5F4CB] rounded-xl px-3 py-2 shadow-sm">
                    <select
                      className="w-full bg-transparent text-emerald-950 outline-none pr-6 cursor-pointer"
                      value={columns[idx] ?? ""}
                      onChange={(e) => setColumn(idx, e.target.value)}
                    >
                      {(!optionsForIndex(idx).includes(columns[idx])) && columns[idx] && (
                        <option value={columns[idx]}>{columns[idx]}</option>
                      )}
                      {optionsForIndex(idx).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => removeColumn(idx)}
                    className="rounded-full w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 cursor-pointer"
                    title="Eliminar columna"
                    aria-label="Eliminar columna"
                  >
                    –
                  </button>
                </div>
              ))}

              <div className="flex justify-center pt-2">
                <button
                  onClick={addColumn}
                  disabled={!firstUnusedOption()}
                  className="rounded-full w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  title="Agregar columna"
                  aria-label="Agregar columna"
                >
                  +
                </button>
              </div>
            </div>
          </section>

          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-white/15 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#F5F4CB] text-emerald-950 font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </aside>

      {denyOpen ? (
        <AccessDeniedModal message="Acceso denegado: solo administradores pueden editar reglas." />
      ) : null}
    </>
  );
}
