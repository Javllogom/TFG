import { supabaseServer } from "./supabase";  // Importa supabaseServer

// Verificar si el usuario está autenticado y tiene el rol adecuado
export async function checkAdmin() {
  const { data: { session }, error } = await supabaseServer().auth.getSession();  // Obtener la sesión actual
  if (error || !session || session.user?.role !== "admin") {
    throw new Error("Acceso denegado. Solo los administradores pueden acceder a esta página.");
  }
  return session.user;  // Devuelve el usuario si tiene rol admin
}
