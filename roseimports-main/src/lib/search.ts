/**
 * Busca por texto livre nas consultas do PostgREST.
 *
 * O termo digitado vai parar dentro do filtro `or=(...)`, onde vírgula,
 * parêntese, ponto e dois-pontos são separadores da sintaxe. Interpolar o
 * termo cru quebra a consulta — e deixa o filtro ser reescrito de fora
 * ("yara,active.eq.true"). (§45)
 */

/** Quantas palavras do termo entram na consulta antes de virar ruído. */
const MAX_TOKENS = 5;

/**
 * Envolve o valor em aspas duplas, que é como o PostgREST aceita
 * separadores dentro de um filtro. As aspas e barras invertidas do próprio
 * termo precisam ser escapadas para não fechar a string antes da hora —
 * escapamento idêntico ao do JSON.
 */
function quote(value: string): string {
  return JSON.stringify(value);
}

/**
 * Divide o termo em palavras e devolve um filtro `or` por palavra.
 *
 * Chamar `.or()` uma vez por palavra gera parâmetros separados, que o
 * PostgREST combina com AND: "Lattafa, Khamrah" acha o produto Khamrah da
 * marca Lattafa, em vez de procurar a frase inteira em um campo só.
 *
 * Devolve lista vazia quando não sobra nada pesquisável.
 */
export function searchOrFilters(
  term: string,
  columns: readonly string[] = ["name", "brand"],
): string[] {
  return term
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, MAX_TOKENS)
    .map((token) =>
      columns
        .map((column) => `${column}.ilike.${quote(`%${token}%`)}`)
        .join(","),
    );
}
