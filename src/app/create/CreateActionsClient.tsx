"use client";

import Link from "next/link";
import { useState } from "react";
import AccessDeniedModal from "@/components/AccessDeniedModal";
import { useMe } from "@/lib/useMe";

export default function CreateActionsClient() {
  const { isAdmin, loading } = useMe();
  const [denyOpen, setDenyOpen] = useState(false);

  function guardClick(e: React.MouseEvent) {
    // mientras carga /me, evitamos acciones raras
    if (loading) {
      e.preventDefault();
      return;
    }
    if (!isAdmin) {
      e.preventDefault();
      setDenyOpen(true);
    }
  }

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <Link
          href="/create/panel"
          onClick={guardClick}
          className="w-full block rounded-xl border border-emerald-900/20 bg-white/20 p-6 hover:bg-white/30 hover:shadow-md transition"
        >
          <h2 className="text-2xl font-bold text-emerald-950 mb-2">Crear panel desde 0</h2>
          <p className="text-emerald-950/80">
            Crea un nuevo panel manualmente y añade su información inicial.
          </p>
        </Link>

        <Link
          href="/create/import-stix"
          onClick={guardClick}
          className="w-full block rounded-xl border border-emerald-900/20 bg-white/20 p-6 hover:bg-white/30 hover:shadow-md transition"
        >
          <h2 className="text-2xl font-bold text-emerald-950 mb-2">Importar STIX</h2>
          <p className="text-emerald-950/80">
            Sube un JSON STIX para generar paneles automáticamente.
          </p>
        </Link>
      </section>

      {denyOpen ? (
        <AccessDeniedModal
          mode="soft"
          message="Acceso denegado: solo administradores pueden crear paneles o importar STIX."
          onClose={() => setDenyOpen(false)}
        />
      ) : null}
    </>
  );
}
