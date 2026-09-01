"use client";

import { useFavorites } from "@/features/favorites/use-favorites";

/**
 * Coração de favoritar. Antes da hidratação o estado é sempre "inativo"
 * e o botão fica inerte: pintar o coração cheio a partir do servidor
 * causaria divergência de hidratação e piscada no ícone.
 */
export function FavoriteButton({
  productId,
  productName,
  className = "",
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { isFavorite, toggle, ready } = useFavorites();
  const active = ready && isFavorite(productId);

  return (
    <button
      type="button"
      onClick={(event) => {
        // Dentro do card o coração fica sobre o link do produto.
        event.preventDefault();
        event.stopPropagation();
        toggle(productId);
      }}
      aria-pressed={active}
      aria-label={
        active
          ? `Remover ${productName} dos favoritos`
          : `Adicionar ${productName} aos favoritos`
      }
      title={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`
        flex h-11 w-11 items-center justify-center rounded-full
        border border-line bg-surface/95 backdrop-blur-sm
        transition-all duration-200
        hover:border-rose hover:text-rose
        active:scale-95
        ${active ? "text-rose" : "text-ink"}
        ${className}
      `}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </button>
  );
}
