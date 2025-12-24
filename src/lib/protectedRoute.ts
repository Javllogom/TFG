import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";
import { hashToken } from "@/lib/auth";
import { redirect } from "next/navigation";

export type AppSession = {
  id: number;
  email: string;
  username: string;
  role: "admin" | "user";
};

export async function getAppSession(): Promise<AppSession | null> {
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "bb_session";
  const store = await cookies();
  const token = store.get(cookieName)?.value;

  if (!token) return null;

  const supabase = supabaseServer();
  const tokenHash = hashToken(token);

  const { data: session } = await supabase
    .from("sessions")
    .select("user_id, expires_at")
    .eq("token", tokenHash)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, email, username, role")
    .eq("id", session.user_id)
    .single();

  return (user as any) ?? null;
}

export async function requireAdmin() {
  const user = await getAppSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
