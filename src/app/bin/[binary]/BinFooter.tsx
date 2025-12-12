"use client";

import { useState, useTransition } from "react";
import { exportBinaryToStix } from "./actions";

function StixIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 3l7 4v10l-7 4-7-4V7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 10.5l3-1.5 3 1.5m-3 1.5v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function BinFooter({ binary }: { binary: string }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [downloadPath, setDownloadPath] = useState<string | null>(null);

  const handleClick = () => {
    setStatus("idle");
    startTransition(async () => {
      try {
        const res = await exportBinaryToStix(binary);
        setDownloadPath(res.path);
        setStatus("ok");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    });
  };

  const closePopup = () => setStatus("idle");

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="
          fixed bottom-6 right-6 md:bottom-8 md:right-8
          z-50
          flex items-center gap-2
          rounded-full px-4 py-2
          bg-[#0B3D06]
          text-[#F5F4CB]
          border border-[#F5F4CB]/60
          shadow-lg
          hover:bg-[#082d04]
          active:bg-[#061f03]
          transition text-sm font-semibold
        "
      >
        <span className={isPending ? "animate-spin" : ""}>
          <StixIcon className="w-4 h-4" />
        </span>
        <span>{isPending ? "Exportando..." : "Exportar a STIX"}</span>
      </button>

      {/* Popup éxito */}
      {status === "ok" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#F5F4CB] text-emerald-900 rounded-xl shadow-2xl px-6 py-5 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">
              Exportación completada
            </h3>
            <p className="text-sm mb-4">
              El binario <strong>{binary}</strong> ha sido exportado exitosamente
              a STIX.
            </p>
            <div className="flex flex-wrap gap-3 justify-end">
              {downloadPath && (
                <a
                  href={downloadPath}
                  download
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-[#0B3D06] text-[#F5F4CB] text-sm font-semibold hover:bg-[#082d04] transition"
                >
                  <StixIcon className="w-4 h-4" />
                  <span>Descargar JSON</span>
                </a>
              )}
              <button
                type="button"
                onClick={closePopup}
                className="inline-flex items-center rounded-full px-4 py-2 border border-emerald-900 text-emerald-900 text-sm font-semibold hover:bg-emerald-900 hover:text-[#F5F4CB] transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup error */}
      {status === "error" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#F5F4CB] text-red-800 rounded-xl shadow-2xl px-6 py-5 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">
              Error al exportar
            </h3>
            <p className="text-sm mb-4">
              Hubo un problema al exportar a STIX. Revisa los logs del servidor
              o inténtalo de nuevo.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closePopup}
                className="inline-flex items-center rounded-full px-4 py-2 border border-red-700 text-red-800 text-sm font-semibold hover:bg-red-700 hover:text-[#F5F4CB] transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
