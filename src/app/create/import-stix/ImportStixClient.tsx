"use client";

import { useRef, useState } from "react";
import AccessDeniedModal from "@/components/AccessDeniedModal";
import { useMe } from "@/lib/useMe";
import CreatePanelForm from "@/app/create/panel/CreatePanelForm"; // ajusta si tu ruta difiere
import { parseStixBundleToPanelDraft, DEFAULT_COLUMNS } from "@/lib/stixImport";

type Draft = {
  title: string;
  rule: string;
  description?: string;
  link?: string;
  columns: string[];
};

export default function ImportStixClient() {
  const { isAdmin, loading } = useMe();
  const [denyOpen, setDenyOpen] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    rule: "",
    description: "",
    link: "",
    columns: DEFAULT_COLUMNS,
  });

  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const imported = !!fileName;

  function guardAdmin(): boolean {
    if (loading) return false;
    if (!isAdmin) {
      setDenyOpen(true);
      return false;
    }
    return true;
  }

  function openPicker() {
    if (!guardAdmin()) return;
    setError(null);

    // ✅ Truco: permitir elegir el mismo archivo dos veces seguidas
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  }

  async function onFileSelected(file: File | null) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Debes seleccionar un archivo .json");
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const parsed = parseStixBundleToPanelDraft(json);

      setDraft({
        title: parsed.title,
        rule: parsed.rule,
        description: parsed.description ?? "",
        link: parsed.link ?? "",
        columns: parsed.columns,
      });

      setFileName(file.name);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Archivo STIX inválido.");
      setFileName(null);
      setDraft({
        title: "",
        rule: "",
        description: "",
        link: "",
        columns: DEFAULT_COLUMNS,
      });
    }
  }

  function onClear() {
    if (!guardAdmin()) return;
    setFileName(null);
    setError(null);
    setDraft({
      title: "",
      rule: "",
      description: "",
      link: "",
      columns: DEFAULT_COLUMNS,
    });
  }

  return (
    <section className="w-full max-w-none">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
      />

      {!imported ? (
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={openPicker}
            className="rounded-full px-5 py-2 bg-[#135B0A] text-[#F5F4CB] font-semibold hover:opacity-90"
          >
            Importar STIX
          </button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="text-emerald-950">
            <div className="font-semibold">Archivo seleccionado:</div>
            <div className="opacity-80">{fileName}</div>
          </div>

          <div className="flex flex-col gap-2 min-w-[180px]">
            <button
              type="button"
              onClick={openPicker}
              className="
      rounded-lg px-4 py-2
      bg-[#135B0A] text-[#F5F4CB] font-semibold
      hover:opacity-90
      shadow-sm
    "
            >
              Cambiar archivo
            </button>

            <button
              type="button"
              onClick={onClear}
              className="
      rounded-lg px-4 py-2
      bg-red-100 text-red-800
      border border-red-300
      hover:bg-red-200
      font-semibold
    "
            >
              Borrar
            </button>
          </div>

        </div>
      )}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-300/40 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      ) : null}

      <CreatePanelForm
        initialValues={{
          title: draft.title,
          rule: draft.rule,
          description: draft.description ?? "",
          link: draft.link ?? "",
          columns: draft.columns,
        }}
        disabled={!imported}
        hidePlaceholders={true}
      />

      {denyOpen ? (
        <AccessDeniedModal
          mode="soft"
          message="Acceso denegado: solo administradores pueden importar STIX."
          onClose={() => setDenyOpen(false)}
        />
      ) : null}
    </section>
  );
}
