"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProductCard } from "@/features/catalog/queries";

/* ---------------------------------------------------------------
   Sorteio único da Home.

   As três áreas que mostram produto — hero, carrossel e faixa de
   destaque — são servidas daqui. Um único sorteio decide as vinte
   vagas de uma vez, então nenhum produto pode aparecer duas vezes na
   página: a exclusividade vem da construção, não de conferência.

   A página é cacheada (revalidate = 60); sortear no servidor
   congelaria a escolha para todo mundo. O sorteio roda no cliente.

   Duas memórias, com papéis diferentes:

   - sessionStorage guarda a escolha da visita atual, carimbada com o
     carregamento do documento. Trocar de aba ou navegar pelo site e
     voltar preserva o que estava na tela; recarregar sorteia de novo.
   - localStorage guarda o que já foi exibido em visitas anteriores.
     O sorteio serve primeiro o que ninguém viu ainda e só reinicia o
     ciclo quando o catálogo se esgota — é o que impede a home de
     repetir os mesmos produtos todo dia.
   --------------------------------------------------------------- */

const PICKS_KEY = "rose:home-picks:v3";
const SEEN_KEY = "rose:home-seen:v1";

const HERO_COUNT = 3;
const EDITORIAL_COUNT = 1;
const CAROUSEL_COUNT = 4;

/** Teto da memória de exibição. Acompanha o POOL_MAX das consultas. */
const SEEN_MAX = 60;

type Picks = {
  hero: ProductCard[];
  editorial: ProductCard | null;
  carousel: ProductCard[];
  /**
   * Falso enquanto o sorteio do cliente não decidiu. O servidor precisa
   * renderizar algum produto para a hidratação bater, mas esse palpite
   * não pode chegar aos olhos de ninguém: quem consome o contexto reserva
   * o espaço e só revela o conteúdo quando isto vira verdadeiro.
   */
  ready: boolean;
};

type PickedIds = {
  heroIds: string[];
  editorialId: string | null;
  carouselIds: string[];
};

type SavedPicks = PickedIds & { docId: number; fixedKey: string };

const HomePicksContext = createContext<Picks>({
  hero: [],
  editorial: null,
  carousel: [],
  ready: false,
});

export function useHomePicks() {
  return useContext(HomePicksContext);
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = out[i] as T;
    const swapped = out[j] as T;
    out[i] = swapped;
    out[j] = current;
  }
  return out;
}

/**
 * Identifica o carregamento atual do documento. `performance.timeOrigin`
 * muda a cada F5 ou nova entrada no site, mas permanece o mesmo durante
 * toda a navegação client-side do Next e ao alternar entre abas.
 */
function documentId(): number {
  return Math.trunc(performance.timeOrigin);
}

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed.filter((id) => typeof id === "string") as string[]) : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-SEEN_MAX)));
  } catch {
    // Sem storage o sorteio segue aleatório; só perde a cobertura.
  }
}

function readSaved(): SavedPicks | null {
  try {
    const raw = sessionStorage.getItem(PICKS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPicks;
    if (!Array.isArray(parsed.heroIds) || !Array.isArray(parsed.carouselIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isStillValid(
  saved: SavedPicks,
  byId: Map<string, ProductCard>,
  fixedKey: string,
) {
  if (saved.docId !== documentId()) return false;
  if (saved.fixedKey !== fixedKey) return false;

  const all = [
    ...saved.heroIds,
    ...saved.carouselIds,
    ...(saved.editorialId ? [saved.editorialId] : []),
  ];

  if (!all.every((id) => byId.has(id))) return false;
  return new Set(all).size === all.length;
}

/**
 * Serve primeiro os produtos que ainda não foram exibidos. Quando o
 * catálogo se esgota, completa com os já vistos e reinicia o ciclo —
 * assim a home percorre todo o acervo antes de repetir qualquer item.
 */
function draw(available: ProductCard[], seen: string[], need: number) {
  const seenSet = new Set(seen);
  const chosen = shuffle(available.filter((product) => !seenSet.has(product.id))).slice(0, need);

  if (chosen.length >= need) {
    return { chosen, cycleReset: false };
  }

  const takenIds = new Set(chosen.map((product) => product.id));
  const leftovers = shuffle(available.filter((product) => !takenIds.has(product.id)));

  return {
    chosen: [...chosen, ...leftovers.slice(0, need - chosen.length)],
    cycleReset: true,
  };
}

export function HomePicks({
  pool,
  fixedCarouselIds,
  children,
}: {
  pool: ProductCard[];
  /** Ranking real de vendas: ocupa o carrossel e fica fora do sorteio. */
  fixedCarouselIds: string[];
  children: ReactNode;
}) {
  const fixedKey = useMemo(() => fixedCarouselIds.join("|"), [fixedCarouselIds]);

  const available = useMemo(() => {
    const blocked = new Set(fixedCarouselIds);
    return pool.filter((product) => !blocked.has(product.id));
  }, [pool, fixedCarouselIds]);

  const availableKey = useMemo(
    () => available.map((product) => product.id).join("|"),
    [available],
  );

  const drawCount = Math.max(0, CAROUSEL_COUNT - fixedCarouselIds.length);

  // O primeiro render — servidor e primeira passada do cliente — é
  // determinístico: sem isso a hidratação acusa divergência.
  const [picked, setPicked] = useState<PickedIds>(() => {
    const head = available.slice(0, HERO_COUNT + EDITORIAL_COUNT + drawCount);
    return {
      heroIds: head.slice(0, HERO_COUNT).map((product) => product.id),
      editorialId: head[HERO_COUNT]?.id ?? null,
      carouselIds: head.slice(HERO_COUNT + EDITORIAL_COUNT).map((product) => product.id),
    };
  });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const byId = new Map(available.map((product) => [product.id, product] as const));

    const saved = readSaved();
    if (saved && isStillValid(saved, byId, fixedKey)) {
      setPicked({
        heroIds: saved.heroIds,
        editorialId: saved.editorialId,
        carouselIds: saved.carouselIds,
      });
      setReady(true);
      return;
    }

    const need = HERO_COUNT + EDITORIAL_COUNT + drawCount;
    const { chosen, cycleReset } = draw(available, readSeen(), need);

    const next: PickedIds = {
      heroIds: chosen.slice(0, HERO_COUNT).map((product) => product.id),
      editorialId: chosen[HERO_COUNT]?.id ?? null,
      carouselIds: chosen.slice(HERO_COUNT + EDITORIAL_COUNT).map((product) => product.id),
    };

    setPicked(next);
    setReady(true);

    const shownIds = chosen.map((product) => product.id);
    writeSeen(cycleReset ? shownIds : [...readSeen(), ...shownIds]);

    try {
      sessionStorage.setItem(
        PICKS_KEY,
        JSON.stringify({ ...next, docId: documentId(), fixedKey } satisfies SavedPicks),
      );
    } catch {
      // Sem storage a escolha ainda vale para esta renderização.
    }
    // availableKey/fixedKey descrevem o conteúdo: evita reexecutar a cada
    // render só porque o array chegou com outra referência.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableKey, fixedKey, drawCount]);

  const value = useMemo<Picks>(() => {
    const byId = new Map(pool.map((product) => [product.id, product] as const));
    const resolve = (ids: string[]) =>
      ids
        .map((id) => byId.get(id))
        .filter((product): product is ProductCard => Boolean(product));

    return {
      hero: resolve(picked.heroIds),
      editorial: picked.editorialId ? byId.get(picked.editorialId) ?? null : null,
      // O ranking real vem primeiro; o sorteio completa as vagas restantes.
      carousel: [...resolve(fixedCarouselIds), ...resolve(picked.carouselIds)],
      ready,
    };
  }, [pool, fixedCarouselIds, picked, ready]);

  return <HomePicksContext.Provider value={value}>{children}</HomePicksContext.Provider>;
}
