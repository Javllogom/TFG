export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/protectedRoute";
import DatabaseConfigForm from "./DatabaseConfigForm";
import AccessDeniedModal from "@/components/AccessDeniedModal";

export default async function DatabasePage() {
  const user = await getAppSession();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.role === "admin";

  return (
    <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-emerald-950 mb-6">
          Cargar Base de Datos
        </h1>

        <div className={isAdmin ? "" : "pointer-events-none select-none blur-[1px] opacity-80"}>
          <DatabaseConfigForm />
        </div>
      </div>

      {!isAdmin ? (
        <AccessDeniedModal message="Tu usuario no tiene permisos para cargar la base de datos." />
      ) : null}
    </main>
  );
}
