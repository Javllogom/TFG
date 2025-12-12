"use client";

import { useState, useTransition } from "react";
import { writeEnvLocal } from "./actions";


export default function DatabaseConfigForm() {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [envContent, setEnvContent] = useState("");

  const [applyStatus, setApplyStatus] = useState<"idle" | "ok" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const handleApply = () => {
    setApplyStatus("idle");
    startTransition(async () => {
      try {
        await writeEnvLocal({ url, anonKey, serviceRoleKey: serviceKey });
        setApplyStatus("ok");
      } catch (e) {
        console.error(e);
        setApplyStatus("error");
      }
    });
  };


  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();

    const lines: string[] = [];

    if (url.trim()) {
      lines.push(`NEXT_PUBLIC_SUPABASE_URL=${url.trim()}`);
    } else {
      lines.push(`# NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL`);
    }

    if (anonKey.trim()) {
      lines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey.trim()}`);
    } else {
      lines.push(`# NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY`);
    }

    if (serviceKey.trim()) {
      lines.push(`SUPABASE_SERVICE_ROLE_KEY=${serviceKey.trim()}`);
    } else {
      lines.push(`# SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY (optional)`);
    }

    const content = lines.join("\n") + "\n";
    setEnvContent(content);
  };

  const downloadEnv = () => {
    if (!envContent) return;
    const blob = new Blob([envContent], { type: "text/plain;charset=utf-8" });
    const urlBlob = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlBlob;
    a.download = ".env.local";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(urlBlob);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-emerald-900 mb-1">
            Supabase URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxxx.supabase.co"
            className="w-full rounded-md border border-emerald-900/30 px-3 py-2 text-sm font-mono bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-700/60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-900 mb-1">
            Supabase anon key
          </label>
          <input
            type="password"
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full rounded-md border border-emerald-900/30 px-3 py-2 text-sm font-mono bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-700/60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-900 mb-1">
            Service role key (opcional, solo servidor)
          </label>
          <input
            type="password"
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
            placeholder="service-role-key (no exponer en cliente)"
            className="w-full rounded-md border border-emerald-900/30 px-3 py-2 text-sm font-mono bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-700/60"
          />
          <p className="mt-1 text-xs text-emerald-900/70">
            No uses esta clave en código cliente. Solo se debe leer en el lado
            servidor.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-[#135B0A] text-[#F5F4CB] text-sm font-semibold border border-[#F5F4CB]/60 shadow-sm hover:bg-[#0f3f0a] active:bg-[#0b3207] transition"
        >
          Generar configuración
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-[#0B3D06] text-[#F5F4CB] text-sm font-semibold border border-[#F5F4CB]/60 shadow-sm hover:bg-[#082d04] active:bg-[#061f03] transition"
        >
          {isPending ? "Aplicando..." : "Aplicar y sobrescribir .env.local"}
        </button>

        {applyStatus === "ok" && (
          <div className="mt-3 rounded-md border border-emerald-900/20 bg-white/70 p-3 text-sm text-emerald-900">
            ✅ Archivo <code>.env.local</code> actualizado.
            <div className="mt-1">
              Ahora reinicia el servidor: <code>Ctrl+C</code> y <code>npm run dev</code>.
            </div>
          </div>
        )}

        {applyStatus === "error" && (
          <div className="mt-3 rounded-md border border-red-700/30 bg-red-50 p-3 text-sm text-red-800">
            ❌ Error escribiendo <code>.env.local</code>. Revisa permisos o logs.
          </div>
        )}

      </form>

      {envContent && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-emerald-900/80">
            Copia esto en un archivo <code>.env.local</code> en la raíz del
            proyecto y reinicia el servidor de desarrollo.
          </p>
          <textarea
            readOnly
            value={envContent}
            className="w-full h-32 rounded-md border border-emerald-900/30 px-3 py-2 text-xs font-mono bg-white/90"
          />
          <button
            type="button"
            onClick={downloadEnv}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-[#0B3D06] text-[#F5F4CB] text-sm font-semibold border border-[#F5F4CB]/60 shadow-sm hover:bg-[#082d04] active:bg-[#061f03] transition"
          >
            Descargar .env.local
          </button>
        </div>
      )}
    </div>
  );
}
