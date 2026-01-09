import ChartStats from "@/components/ChartStats";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/protectedRoute";

export default async function StatsPage() {
  const user = await getAppSession();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <ChartStats />
      </div>
    </main>
  );
}
