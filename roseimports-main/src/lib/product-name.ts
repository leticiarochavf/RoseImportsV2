/**
 * Padroniza o nome exibido no catálogo e converte um apelido entre aspas em
 * sufixo. Apóstrofos internos, como em L'Aventure, são preservados.
 */
export function normalizeProductName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  const quotedAlias = normalized.match(
    /“([^”]+)”|"([^"]+)"|‘([^’]+)’|(?:^|\s)'([^']+)'(?=$|[\s,])/u,
  );
  const alias = quotedAlias?.slice(1).find(Boolean);

  if (quotedAlias && alias) {
    const baseName = normalized
      .replace(quotedAlias[0], " ")
      .replace(/\s+,/g, ",")
      .replace(/,{2,}/g, ",")
      .replace(/[\s,+–—-]+$/u, "")
      .trim();

    if (baseName) {
      return `${baseName} - ${alias.trim().replace(/\s+/g, " ")}`.toLocaleUpperCase(
        "pt-BR",
      );
    }
  }

  return normalized.toLocaleUpperCase("pt-BR");
}
