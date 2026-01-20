export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/protectedRoute";

export default async function ImportStixPage() {
  const user = await getAppSession();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-950 mb-6">Importar STIX</h1>
        <p className="text-emerald-950/80">
          (Pendiente) Aquí irá el uploader del JSON STIX.
        </p>
      </div>
    </main>
  );
}
