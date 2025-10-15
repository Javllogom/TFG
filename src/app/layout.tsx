import "./globals.css";
import Header from "@/components/Header";

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
      <body className="min-h-screen">
        <Header />
        {children}
      </body>
    </html>
  );
}
