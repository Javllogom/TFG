"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type User = {
  id: number;
  email: string;
  username: string;
  role: string;
};

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  async function loadMe() {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    loadMe();

    const onAuthChanged = () => loadMe();
    window.addEventListener("auth-changed", onAuthChanged);

    return () => {
      window.removeEventListener("auth-changed", onAuthChanged);
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/";
  };

  return (
    <header className="bg-[#4F9960] border-b-4 border-[#F7F5D7] text-white h-28">
      <div className="w-full flex items-center justify-between h-full">
        <div className="relative h-[115px] w-[230px] flex-shrink-0 ml-10">
          <Image
            src="/Logo.png"
            alt="BinBoard logo"
            fill
            className="object-contain"
            priority
          />
        </div>

        <nav className="flex gap-10 text-lg font-semibold items-center pr-10">
          <Link href="/" className="hover:underline">
            Inicio
          </Link>

          {user?.role === "admin" ? (
            <Link href="/database" className="hover:underline">
              Cargar Base de Datos
            </Link>
          ) : null}

          <Link href="/stats" className="hover:underline">
            Estadísticas
          </Link>

          <Link href="/create">Crear</Link>


          {!user ? (
            <>
              <Link href="/login" className="hover:underline">
                Iniciar sesión
              </Link>
              <Link href="/register" className="hover:underline">
                Registrarse
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-4 bg-[#3B7F4A] px-4 py-2 rounded-full">
              <span className="font-bold">👤 {user.username}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm underline hover:text-[#F7F5D7] cursor-pointer"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
