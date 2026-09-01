"use client";

import { useFavorites } from "@/features/favorites/use-favorites";

/**
 * Selo com a quantidade de favoritos. Fica oculto até a montagem, para
 * não divergir da marcação vinda do servidor — que não tem acesso ao
 * `localStorage` e portanto nunca sabe a contagem.
 */
export function FavoritesCount() {
  const { count, ready } = useFavorites();

  if (!ready || count === 0) return null;

  return (
    <span
      aria-hidden
      className="
        absolute -right-1 -top-1
        inline-flex min-w-5 items-center justify-center
        rounded-full bg-rose px-1.5
        text-[0.65rem] font-semibold leading-5 text-white
      "
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
