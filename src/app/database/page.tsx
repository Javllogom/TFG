import DatabaseConfigForm from "./DatabaseConfigForm";

export default function DatabasePage() {
  const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <main className="min-h-screen bg-[#F5F4CB] px-6 py-10">
      <section className="max-w-3xl mx-auto bg-white/70 rounded-xl border border-emerald-900/20 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-emerald-900 mb-4">
          Cargar / Configurar Base de Datos
        </h1>

        <p className="text-sm text-emerald-900/80 mb-4">
          Este proyecto se conecta a una base de datos Supabase usando
          variables de entorno en el archivo <code>.env.local</code>. Aquí
          puedes generar la configuración necesaria para enlazar tu propia
          instancia.
        </p>

        <div className="mb-6 text-sm text-emerald-900/80 space-y-1">
          <p>
            <strong>URL actual:</strong>{" "}
            {currentUrl ? (
              <span className="font-mono">{currentUrl}</span>
            ) : (
              <span className="italic text-emerald-900/70">
                (no configurada)
              </span>
            )}
          </p>
          <p>
            <strong>Anon key:</strong>{" "}
            {hasAnonKey ? "•••••• (configurada)" : "no configurada"}
          </p>
        </div>

        <DatabaseConfigForm />
      </section>
    </main>
  );
}
