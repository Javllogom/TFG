"use client";

import { useState } from "react";

export default function DatabaseConfigForm() {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [envContent, setEnvContent] = useState("");

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
