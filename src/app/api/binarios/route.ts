import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase"; // Importar supabaseServer

export async function GET() {
  return NextResponse.json([]); // reemplaza por tu lógica real
}