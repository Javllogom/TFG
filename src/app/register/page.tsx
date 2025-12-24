'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Error registrando usuario.");
        return;
      }

      window.dispatchEvent(new Event("auth-changed"));
      router.push("/");
      setTimeout(() => window.dispatchEvent(new Event("auth-changed")), 150);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#F5F4CB] px-4">
      <form onSubmit={handleRegister} className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-emerald-950">Registrarse</h2>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 text-emerald-950">Nombre de usuario</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border border-emerald-950/20 rounded-md bg-white text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-700/30"
            placeholder="ej: javi_23"
            required
          />
          <p className="text-xs text-emerald-950/70 mt-1">3-20 caracteres, letras/números/._</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 text-emerald-950">Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-emerald-950/20 rounded-md bg-white text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-700/30"
            placeholder="tuemail@ejemplo.com"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 text-emerald-950">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-emerald-950/20 rounded-md bg-white text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-700/30"
            placeholder="Mínimo 8 caracteres"
            required
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-emerald-950">Repetir contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-2 border border-emerald-950/20 rounded-md bg-white text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-700/30"
            placeholder="Repite la contraseña"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 bg-[#135B0A] text-white rounded-md disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Registrando..." : "Registrarse"}
        </button>
      </form>
    </div>
  );
}
