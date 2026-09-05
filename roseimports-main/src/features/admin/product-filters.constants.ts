/**
 * Constantes da listagem de produtos do painel.
 *
 * Ficam fora de `product-filters.tsx` porque aquele arquivo é `"use client"`:
 * no grafo do servidor, todo export de um módulo cliente vira referência de
 * componente, e o array deixaria de ser array. Mesmo arranjo do catálogo,
 * onde CATALOG_PAGE_SIZE mora em `queries.ts`, não no componente de filtros.
 */

export const ADMIN_PAGE_SIZES = [30, 50, 100] as const;
export const ADMIN_PAGE_SIZE_DEFAULT = 30;
/** Só existe no painel: a loja nunca lista o catálogo inteiro de uma vez. */
export const ADMIN_PAGE_SIZE_ALL = "todos";
