"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Atalho para o painel, visível só para administradores.
 *
 * A checagem acontece no navegador de propósito: o header é compartilhado
 * pela home e pelas páginas de produto, que são cacheadas (revalidate=60).
 * Ler a sessão no servidor tornaria essas páginas dinâmicas e mais lentas
 * para todo visitante. (perf)
 *
 * Isto é conveniência de navegação, nunca proteção: cada página do painel
 * e cada server action exigem perfil de administrador no servidor. (§34)
 */
export function AdminLink({ className = "" }: { className?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    async function check() {
      const supabase = createClient();

      // Leitura local do cookie de sessão: sem ida à rede para visitantes.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      // Perfil é o que define administrador, igual ao is_admin() do banco.
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (active && profile) setIsAdmin(true);
    }

    void check();

    return () => {
      active = false;
    };
  }, [pathname]);

  if (!isAdmin) return null;

  const inAdmin = pathname.startsWith("/admin");

  return (
    <Link
      href={inAdmin ? "/" : "/admin"}
      className={className}
    >
      {inAdmin ? "Ver loja" : "Administração"}
    </Link>
  );
}
