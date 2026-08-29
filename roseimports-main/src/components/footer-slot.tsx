"use client";

import { usePathname } from "next/navigation";

/**
 * O rodapé da loja não aparece no painel: ali ele é conteúdo de vitrine
 * no meio de uma área de trabalho. Fora do /admin, nada muda.
 *
 * O rodapé continua sendo server component — entra aqui como children,
 * já renderizado no servidor.
 */
export function FooterSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return <>{children}</>;
}
