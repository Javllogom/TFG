'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Error de login.");
        return;
      }

      router.push("/");
      setTimeout(() => window.dispatchEvent(new Event("auth-changed")), 0);
      setTimeout(() => window.dispatchEvent(new Event("auth-changed")), 250);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#F5F4CB] px-4">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-emerald-950">Iniciar sesión</h2>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 text-emerald-950">
            Correo electrónico
          </label>
          <input
            type="email"
            className="w-full p-2 border border-emerald-950/20 rounded-md bg-white text-emerald-950 placeholder:text-emerald-950/40 outline-none focus:ring-2 focus:ring-emerald-700/30"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tuemail@ejemplo.com"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 text-emerald-950">
            Contraseña
          </label>
          <input
            type="password"
            className="w-full p-2 border border-emerald-950/20 rounded-md bg-white text-emerald-950 placeholder:text-emerald-950/40 outline-none focus:ring-2 focus:ring-emerald-700/30"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 bg-[#135B0A] text-white rounded-md disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Entrando..." : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
