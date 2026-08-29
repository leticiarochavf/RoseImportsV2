import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client com service role: IGNORA RLS.
 *
 * Uso restrito à criação do pré-pedido em /api/pedidos, onde o preço e a
 * disponibilidade são recalculados a partir do banco. O import de
 * "server-only" faz o build quebrar se este arquivo for parar no bundle
 * do navegador. (§34, §70)
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
