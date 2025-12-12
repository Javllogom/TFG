'use client';
/* Drawer to edit a rule (title, rule, description, columns) */
import { useEffect, useMemo, useRef, useState } from 'react';
import { updateRuleInDb } from "@/app/bin/[binary]/actions";




type RuleEditable = {
    id?: string | null;
    binary: string;         // UI value (trimmed)
    title: string;          // UI value (trimmed)
    rule: string;
    description?: string | null;
    columns: string[];
    // exact DB-match values (untrimmed)
    matchBinary: string;
    matchTitle: string;
};


export default function RuleSettings({
    open,
    onClose,
    initial,
    onSaved,
    availableColumns = [],   // ✅ mantenemos solo esto
}: {
    open: boolean;
    onClose: () => void;
    initial: RuleEditable;
    onSaved?: (updated: RuleEditable) => void;
    availableColumns?: string[];
}) {



    const [title, setTitle] = useState(initial.title ?? '');
    const [rule, setRule] = useState(initial.rule ?? '');
    const [description, setDescription] = useState(initial.description ?? '');
    const [columns, setColumns] = useState<string[]>(() => (Array.isArray(initial.columns) ? initial.columns : []));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- drag & drop reordering for columns ---

    // --- drag & drop reordering for columns ---

    // Which item is being dragged right now
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    // Allow drag only when the handle is pressed (not when user drags the select)
    const allowDragRef = useRef(false);

    // Called from the hamburger button (mousedown) to allow starting a drag
    function allowDragFromHandle() {
        allowDragRef.current = true;
    }

    // Start dragging
    function onDragStart(idx: number, e: React.DragEvent<HTMLDivElement>) {
        if (!allowDragRef.current) {
            // Ignore drags that did not start on the handle
            e.preventDefault();
            return;
        }
        allowDragRef.current = false; // consume permission from handle
        setDragIdx(idx);

        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(idx)); // not really used, but standard
            // Do NOT set a custom dragImage -> browser will use a snapshot of the row (visual ghost)
        }
    }

    // While dragging over another item: live-reorder list
    function onDragOver(idx: number, e: React.DragEvent<HTMLDivElement>) {
        if (dragIdx === null || dragIdx === idx) return;
        e.preventDefault(); // required to allow drop and for smooth DnD

        setColumns(prev => {
            const next = [...prev];
            const [moved] = next.splice(dragIdx, 1);
            next.splice(idx, 0, moved);
            return next;
        });

        // The dragged item is now at this new index
        setDragIdx(idx);
    }

    // We already reordered in onDragOver, so onDrop only clears state
    function onDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDragIdx(null);
    }

    function onDragEnd() {
        setDragIdx(null);
    }



    // Conjunto de columnas ya elegidas EN ESTE PANEL (estado local, no guardado)
    const takenSet = useMemo(() => {
        return new Set(
            (columns ?? []).map(c => String(c ?? '').trim()).filter(Boolean)
        );
    }, [columns]);

    // Opciones disponibles para el chip 'idx':
    // - Base: availableColumns (compatibles)
    // - Excluye todo lo ya tomado salvo el valor actual del chip
    function optionsForIndex(idx: number) {
        const current = String(columns[idx] ?? '').trim();
        return (availableColumns ?? []).filter(opt => !takenSet.has(opt) || opt === current);
    }

    // Primera opción libre para el botón '+'
    function firstUnusedOption() {
        return (availableColumns ?? []).find(opt => !takenSet.has(opt));
    }



    // Track if title changed to auto-save on close
    const initialTitleRef = useRef(initial.title ?? '');
    useEffect(() => {
        initialTitleRef.current = initial.title ?? '';
    }, [initial.title]);

    // Close on ESC / click outside
    const panelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();    // <= only close
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);



    // Reset local state when opening
    useEffect(() => {
        if (open) {
            setTitle(initial.title ?? '');
            setRule(initial.rule ?? '');
            setDescription(initial.description ?? '');
            setColumns(Array.isArray(initial.columns) ? initial.columns : []);
            setError(null);
        }
    }, [open, initial]);

    function addColumn() {
        const next = firstUnusedOption();
        if (!next) return;                 // nada disponible → no añade
        setColumns((prev) => [...prev, next]);  // añade una sola vez
    }


    function removeColumn(idx: number) {
        setColumns((prev) => prev.filter((_, i) => i !== idx));
    }
    function setColumn(idx: number, val: string) {
        setColumns((prev) => prev.map((c, i) => (i === idx ? val : c)));
    }

    async function handleSave() {
  try {
    setSaving(true);
    setError(null);

    // Build payload with the current in-drawer state
    const payload = {
      title: title.trim(),
      rule: rule.trim(),
      description: (description ?? '').trim(),
      // 👇 this preserves the visual order of the columns
      columns: columns.map((c) => c.trim()).filter(Boolean),
    };

    // Call server action to persist in Supabase
    const updated = await updateRuleInDb(payload, {
      id: initial.id ?? undefined,
      matchBinary: initial.matchBinary,
      matchTitle: initial.matchTitle,
    });

    if (!updated) {
      throw new Error('No rows were updated (check matchBinary/matchTitle).');
    }

    // Let parent refresh its own state (including column order)
    onSaved?.({
      ...initial,
      ...payload,
    });

    onClose();
  } catch (e: any) {
    setError(e?.message ?? 'Save failed');
  } finally {
    setSaving(false);
  }
}



    // Prevent scroll bleed when open
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const prev = document.body.style.overflow; // remember previous value

        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        // cleanup MUST return void, not a string
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);


    return (
        <>
            <div
                onClick={onClose}                       // <= only close, no autosave
                className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                aria-hidden
            />



            {/* Panel */}
            <aside
                ref={panelRef}
                className={`fixed inset-y-0 left-0 z-50 w-full max-w-[560px] bg-[#0f4c0d] text-white shadow-2xl border-r border-emerald-900
              transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}
              flex flex-col h-full`} // make vertical layout
                role="dialog"
                aria-modal="true"
            >

                <div className="flex items-center justify-between px-5 py-4 border-b border-white/15">
                    <h2 className="text-2xl font-bold"> {initial.title || 'Rule settings'} </h2>
                    <button
                        onClick={onClose}                       // <= only close, no autosave
                        className="rounded-full p-2 hover:bg-white/10 active:bg-white/20 cursor-pointer" // hand cursor
                        aria-label="Close"
                    >
                        ✕
                    </button>


                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-28">
                    {/* Title */}
                    <section>
                        <h3 className="text-[15px] font-semibold mb-2">Título</h3>
                        <input
                            className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-[#F5F4CB] outline-none placeholder:text-emerald-900/50 shadow-sm"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Título de la regla"
                        />
                    </section>

                    {/* Rule */}
                    <section>
                        <h3 className="text-[15px] font-semibold mb-2">Regla</h3>
                        <textarea
                            className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-[#F5F4CB] outline-none min-h-[120px] resize-vertical shadow-sm"
                            value={rule}
                            onChange={(e) => setRule(e.target.value)}
                            placeholder={`process.name : "bitsadmin.exe" and ...`}
                        />
                    </section>

                    {/* Description */}
                    <section>
                        <h3 className="text-[15px] font-semibold mb-2">Descripción</h3>
                        <textarea
                            className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-[#F5F4CB] outline-none min-h-[90px] resize-vertical shadow-sm"
                            value={description ?? ''}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Explica qué detecta esta regla y por qué es importante."
                        />
                    </section>

                    {/* Columns */}
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

                                    {/* drag handle (hamburger) */}
                                    <button
                                        type="button"
                                        onMouseDown={allowDragFromHandle}        // only start drag from here
                                        className="w-8 h-8 shrink-0 grid place-items-center text-emerald-900/90 bg-[#F5F4CB] rounded-lg cursor-grab active:cursor-grabbing"
                                        title="Arrastrar para reordenar"
                                        aria-label="Arrastrar para reordenar"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                            <path d="M5 8h14M5 12h14M5 16h14" stroke="#135B0A" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </button>


                                    {/* yellow chip with the select inside */}
                                    <div className="flex-1 bg-[#F5F4CB] rounded-xl px-3 py-2 shadow-sm">
                                        <select
                                            className="w-full bg-transparent text-emerald-950 outline-none pr-6 cursor-pointer"
                                            value={columns[idx] ?? ""}
                                            onChange={(e) => setColumn(idx, e.target.value)}
                                        >
                                            {/* keep current value visible even if not in the valid options */}
                                            {(!optionsForIndex(idx).includes(columns[idx])) && columns[idx] && (
                                                <option value={columns[idx]}>{columns[idx]}</option>
                                            )}
                                            {optionsForIndex(idx).map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* remove button (–) */}
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

                            {/* Floating + button centered */}
                            <div className="flex justify-center pt-2">
                                <button
                                    onClick={addColumn}
                                    disabled={!firstUnusedOption()}   // 🔒 desactivado si no quedan opciones
                                    className="rounded-full w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed" // hand cursor (blocked when disabled)
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
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 cursor-pointer" // hand cursor
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-[#F5F4CB] text-emerald-950 font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"                    >
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>

            </aside>
        </>
    );
}
