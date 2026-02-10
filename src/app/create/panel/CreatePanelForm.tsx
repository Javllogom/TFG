"use client";

import { useEffect, useMemo, useState } from "react";
import { createPanelInDb } from "./actions";

/**
 * Columnas disponibles: “todas las que hay en traffic”.
 * Como tu app ya trabaja con estas keys (y son estables), las definimos aquí.
 * Si más adelante añades nuevas columnas, solo amplías este array.
 */
const TRAFFIC_COLUMNS = [
  "timestamp",
  "event.id",
  "event.type",
  "host.name",
  "host.ip",
  "user.name",
  "user.id",
  "process.name",
  "process.executable",
  "process.command_line",
  "process.parent.name",
  "process.pid",
  "process.args",
  "agent.name",
  "source.ip",
  "destination.ip",
] as const;

type PanelDraft = {
  title: string;
  rule: string;
  description?: string;
  link?: string;
  columns: string[];
};

type CreatePanelFormProps = {
  initialValues?: PanelDraft;     // ✅ opcional
  disabled?: boolean;             // ✅ opcional
  hidePlaceholders?: boolean;     // ✅ opcional
};

const DEFAULT_COLUMNS = [
  "timestamp",
  "user.name",
  "host.name",
  "process.executable",
  "process.command_line",
  "process.parent.name",
];

export default function CreatePanelForm({
  initialValues,
  disabled = false,
  hidePlaceholders = false,
}: CreatePanelFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [rule, setRule] = useState(initialValues?.rule ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [link, setLink] = useState(initialValues?.link ?? "");

  const [columns, setColumns] = useState<string[]>(
    Array.isArray(initialValues?.columns) && initialValues!.columns.length > 0
      ? initialValues!.columns
      : DEFAULT_COLUMNS
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // ✅ Cuando cambien initialValues (p.ej. al importar STIX), refresca el formulario
  useEffect(() => {
    if (!initialValues) return;

    setTitle(initialValues.title ?? "");
    setRule(initialValues.rule ?? "");
    setDescription(initialValues.description ?? "");
    setLink(initialValues.link ?? "");

    const nextCols =
      Array.isArray(initialValues.columns) && initialValues.columns.length > 0
        ? initialValues.columns
        : DEFAULT_COLUMNS;

    setColumns(nextCols);
    setErr(null);
    setOkMsg(null);
  }, [initialValues]);

  const takenSet = useMemo(
    () => new Set(columns.map((c) => c.trim()).filter(Boolean)),
    [columns]
  );

  function optionsForIndex(idx: number) {
    const current = (columns[idx] ?? "").trim();
    return TRAFFIC_COLUMNS.filter((opt) => !takenSet.has(opt) || opt === current);
  }

  function firstUnusedOption() {
    return TRAFFIC_COLUMNS.find((opt) => !takenSet.has(opt));
  }

  function addColumn() {
    if (disabled) return;
    const next = firstUnusedOption();
    if (!next) return;
    setColumns((prev) => [...prev, next]);
  }

  function removeColumn(idx: number) {
    if (disabled) return;
    setColumns((prev) => prev.filter((_, i) => i !== idx));
  }

  function setColumn(idx: number, val: string) {
    if (disabled) return;
    setColumns((prev) => prev.map((c, i) => (i === idx ? val : c)));
  }

  async function onSubmit() {
    if (disabled) return;

    setSaving(true);
    setErr(null);
    setOkMsg(null);

    try {
      await createPanelInDb({
        title,
        rule,
        description,
        link,
        columns,
      });

      setOkMsg("Panel creado correctamente.");

      // ✅ Si este formulario se usa “normal” (crear panel desde 0), lo vaciamos.
      // ✅ Si se usa para STIX y quieres mantener lo importado, puedes comentar esto.
      if (!initialValues) {
        setTitle("");
        setRule("");
        setDescription("");
        setLink("");
        setColumns(DEFAULT_COLUMNS);
      }
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo crear el panel");
    } finally {
      setSaving(false);
    }
  }

  const ph = (text: string) => (hidePlaceholders ? "" : text);

  return (
    <div className="bg-[#F5F4CB] rounded-xl border border-emerald-900/20 p-5">
      <div className="space-y-5">
        {/* TITLE */}
        <section>
          <h3 className="text-[15px] font-semibold text-emerald-950 mb-2">Título</h3>
          <input
            className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-white/40 outline-none placeholder:text-emerald-900/50 shadow-sm disabled:opacity-70"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={ph("Ej: PowerShell sospechoso / Living-off-the-land")}
            disabled={disabled || saving}
          />
        </section>

        {/* RULE */}
        <section>
          <h3 className="text-[15px] font-semibold text-emerald-950 mb-2">Regla</h3>
          <textarea
            className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-white/40 outline-none min-h-[140px] resize-vertical shadow-sm disabled:opacity-70"
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            placeholder={ph(`process.name : "powershell.exe" and process.command_line : "*-enc*"`)}
            disabled={disabled || saving}
          />
          <p className="text-xs text-emerald-950/70 mt-2">
            Usa el mismo formato que tus reglas actuales (ruleEngine).
          </p>
        </section>

        {/* DESCRIPTION + LINK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section>
            <h3 className="text-[15px] font-semibold text-emerald-950 mb-2">
              Descripción (opcional)
            </h3>
            <textarea
              className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-white/40 outline-none min-h-[110px] resize-vertical shadow-sm disabled:opacity-70"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={ph("Explica qué detecta este panel y por qué importa.")}
              disabled={disabled || saving}
            />
          </section>

          <section>
            <h3 className="text-[15px] font-semibold text-emerald-950 mb-2">
              Link de referencia (opcional)
            </h3>
            <input
              className="w-full rounded-xl px-4 py-3 text-emerald-950 bg-white/40 outline-none placeholder:text-emerald-900/50 shadow-sm disabled:opacity-70"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={ph("https://...")}
              disabled={disabled || saving}
            />
          </section>
        </div>

        {/* COLUMNS */}
        <section>
          <h3 className="text-[15px] font-semibold text-emerald-950 mb-2">
            Columnas a mostrar
          </h3>

          <div className="space-y-3">
            {columns.map((col, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1 bg-white/40 rounded-xl px-3 py-2 shadow-sm">
                  <select
                    className="w-full bg-transparent text-emerald-950 outline-none pr-6 cursor-pointer disabled:cursor-not-allowed"
                    value={columns[idx] ?? ""}
                    onChange={(e) => setColumn(idx, e.target.value)}
                    disabled={disabled || saving}
                  >
                    {optionsForIndex(idx).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => removeColumn(idx)}
                  disabled={disabled || saving}
                  className="rounded-full w-10 h-10 flex items-center justify-center bg-emerald-900/10 hover:bg-emerald-900/20 active:bg-emerald-900/30 cursor-pointer text-emerald-950 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Eliminar columna"
                  aria-label="Eliminar columna"
                >
                  –
                </button>
              </div>
            ))}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={addColumn}
                disabled={disabled || saving || !firstUnusedOption()}
                className="rounded-full w-12 h-12 flex items-center justify-center bg-emerald-900/10 hover:bg-emerald-900/20 active:bg-emerald-900/30 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-emerald-950"
                title="Agregar columna"
                aria-label="Agregar columna"
              >
                +
              </button>
            </div>
          </div>
        </section>

        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        {okMsg ? <p className="text-sm text-emerald-900">{okMsg}</p> : null}

        {/* ACTIONS */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || saving}
            className="px-4 py-2 rounded-lg bg-[#135B0A] text-[#F5F4CB] font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando…" : "Crear panel"}
          </button>
        </div>
      </div>
    </div>
  );
}
