export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/protectedRoute";
import CreatePanelForm from "./CreatePanelForm";


export default async function CreatePanelPage() {
  const user = await getAppSession();
  if (!user) redirect("/login");

  // Si quieres SOLO admin:
  // if (user.role !== "admin") redirect("/");

  return (
    <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-950 mb-6">Crear panel</h1>
        <CreatePanelForm />
      </div>
    </main>
  );
}
