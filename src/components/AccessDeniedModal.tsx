'use client';

import { useEffect } from "react";

export default function AccessDeniedModal({
  message,
  mode = "hard",
  onClose,
}: {
  message?: string;
  mode?: "hard" | "soft";
  onClose?: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const goHome = () => {
    window.location.href = "/";
  };

  const close = () => {
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#F7F5D7]/30 bg-[#135B0A] text-[#F5F4CB] shadow-xl">
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="text-xl font-bold">Acceso denegado</div>

          {mode === "soft" ? (
            <button
              type="button"
              onClick={close}
              className="rounded-full p-2 hover:bg-white/10 active:bg-white/20 cursor-pointer"
              aria-label="Cerrar"
              title="Cerrar"
            >
              ✕
            </button>
          ) : null}

        </div>

        <div className="px-6 pb-6">
          <p className="mt-2 text-sm text-[#F5F4CB]/90">
            {message ?? "No tienes permisos para acceder a esta sección."}
          </p>

          {mode === "hard" ? (
            <button
              type="button"
              onClick={goHome}
              className="mt-5 w-full rounded-lg bg-[#E58A7B] px-4 py-2 font-bold text-black hover:opacity-90 transition cursor-pointer"
            >
              Volver a la página principal
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
