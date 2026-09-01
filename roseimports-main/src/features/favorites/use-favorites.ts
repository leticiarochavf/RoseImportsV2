"use client";

import { useCallback, useEffect, useState } from "react";

/* ---------------------------------------------------------------
   Favoritos do visitante.

   Guardados no navegador: não há login nem conta de cliente neste
   projeto, e o desejo sinalizado por um clique não justifica pedir
   cadastro. A chave é versionada para que uma mudança de formato no
   futuro não precise interpretar dados antigos.

   `localStorage` não existe no servidor, então nada de favorito pode
   ser renderizado antes da montagem — daí o `ready`, que os
   componentes usam para só pintar o estado depois de hidratar.
   --------------------------------------------------------------- */

const STORAGE_KEY = "rose-imports:favoritos:v1";

/** Avisa as outras instâncias do hook na mesma aba. */
const CHANGE_EVENT = "rose-imports:favoritos-alterados";

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    // Modo privado, storage bloqueado ou JSON corrompido: começa vazio.
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage cheio ou indisponível não pode derrubar a página; o
    // estado em memória segue valendo para esta navegação.
  }
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(read());
    setReady(true);

    const sync = () => setIds(read());

    // `storage` cobre outras abas; o evento próprio cobre esta.
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];

      write(next);
      window.dispatchEvent(new Event(CHANGE_EVENT));

      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => ids.includes(id),
    [ids],
  );

  return { ids, count: ids.length, ready, toggle, isFavorite };
}
