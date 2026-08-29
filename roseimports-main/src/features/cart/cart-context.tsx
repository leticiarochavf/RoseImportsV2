"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { track } from "@/lib/analytics";

const STORAGE_KEY = "rose-imports:cart:v1";

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  productName: string;
  variantLabel: string;
  /** Só para exibição. O servidor recalcula o preço ao gerar o pedido. */
  priceCents: number;
  imagePath: string | null;
  quantity: number;
  /** Estoque conhecido quando o item entrou no carrinho. */
  maxQuantity: number;
};

type CartContextValue = {
  items: CartItem[];
  /** false até o localStorage ser lido — evita divergência na hidratação. */
  ready: boolean;
  count: number;
  subtotalCents: number;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** Corrige o carrinho quando o servidor recusa itens por estoque. */
  applyAvailability: (
    updates: { variantId: string; available: number }[],
  ) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem =>
        typeof i === "object" &&
        i !== null &&
        typeof (i as CartItem).variantId === "string" &&
        typeof (i as CartItem).quantity === "number",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Modo privado com armazenamento cheio: o carrinho segue na memória.
    }
  }, [items, ready]);

  const add = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      setItems((current) => {
        const existing = current.find((i) => i.variantId === item.variantId);

        if (existing) {
          const next = Math.min(
            existing.quantity + quantity,
            item.maxQuantity || existing.maxQuantity,
          );
          return current.map((i) =>
            i.variantId === item.variantId
              ? { ...i, ...item, quantity: next }
              : i,
          );
        }

        return [
          ...current,
          { ...item, quantity: Math.min(quantity, item.maxQuantity) },
        ];
      });

      track({ name: "add_to_cart", variantId: item.variantId, quantity });
    },
    [],
  );

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((current) =>
      current.flatMap((i) => {
        if (i.variantId !== variantId) return [i];
        const next = Math.min(Math.max(quantity, 0), i.maxQuantity);
        return next <= 0 ? [] : [{ ...i, quantity: next }];
      }),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((current) => current.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const applyAvailability = useCallback(
    (updates: { variantId: string; available: number }[]) => {
      const map = new Map(updates.map((u) => [u.variantId, u.available]));
      setItems((current) =>
        current.flatMap((i) => {
          const available = map.get(i.variantId);
          if (available === undefined) return [i];
          if (available <= 0) return [];
          return [
            {
              ...i,
              maxQuantity: available,
              quantity: Math.min(i.quantity, available),
            },
          ];
        }),
      );
    },
    [],
  );

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotalCents = items.reduce(
      (sum, i) => sum + i.priceCents * i.quantity,
      0,
    );
    return {
      items,
      ready,
      count,
      subtotalCents,
      add,
      setQuantity,
      remove,
      clear,
      applyAvailability,
    };
  }, [items, ready, add, setQuantity, remove, clear, applyAvailability]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart precisa estar dentro de CartProvider.");
  }
  return context;
}
