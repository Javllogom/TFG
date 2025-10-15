import "./globals.css";

export const metadata = {
  title: "BinBoard",
  description: "Plataforma para analizar binarios explotables en Windows",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-emerald-900 text-white p-4 font-semibold">
          BinBoard
        </header>
        <main className="max-w-6xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
