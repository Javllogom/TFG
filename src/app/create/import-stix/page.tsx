export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/protectedRoute";
import ImportStixClient from "./ImportStixClient";

export default async function ImportStixPage() {
  const user = await getAppSession();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-[#F5F4CB] w-screen max-w-none px-4 sm:px-6 py-10">
      <div className="w-full max-w-none">
        <h1 className="text-4xl font-bold text-emerald-950 mb-8 text-center">
          Importar STIX
        </h1>

        <ImportStixClient />
      </div>
    </main>
  );
}
