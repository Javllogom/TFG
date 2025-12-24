'use client';

import { useEffect, useState } from "react";

type MeUser = { id: number; email: string; username: string; role: "admin" | "user" };
type MeResponse = { user: MeUser | null };

export function useMe() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const data = (await res.json()) as MeResponse;
      setUser(data.user ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onAuth = () => load();
    window.addEventListener("auth-changed", onAuth);
    return () => window.removeEventListener("auth-changed", onAuth);
  }, []);

  return { user, isAdmin: user?.role === "admin", loading, refresh: load };
}
