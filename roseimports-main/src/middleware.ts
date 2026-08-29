import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Só o /admin precisa de sessão renovada e proteção de rota. Rodar o
  // middleware nas rotas públicas forçava um getUser() (round-trip ao
  // Supabase Auth) a cada troca de tela, sem necessidade. (perf)
  matcher: ["/admin/:path*"],
};
