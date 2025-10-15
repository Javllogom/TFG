'use client';
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const menuItems = [
    { name: "Inicio", href: "/" },
    { name: "Cargar Fichero", href: "/upload" },
    { name: "Cómo Funciona", href: "/funcionamiento" },
    { name: "Documentación", href: "/docs" },
    { name: "Estadísticas", href: "/estadisticas" },
  ];

  return (
    <header className="bg-[#4F9960] border-b-4 border-[#F7F5D7] text-white h-28">
      <div className="w-full flex items-center justify-between h-full">
        {/* Logo grande totalmente a la izquierda */}
        <div className="relative h-[115px] w-[230px] flex-shrink-0 ml-10">
          <Image
            src="/Logo.png"
            alt="BinBoard logo"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Menú */}
        <nav className="flex gap-10 text-lg font-semibold items-center pr-10">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="hover:text-[#F7F5D7] transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
