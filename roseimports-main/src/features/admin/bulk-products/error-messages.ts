export function translateBulkImportError(message: string): string {
  if (message.includes("idempotency_key_reused_with_different_payload")) {
    return "Esta confirmação já foi usada para outro conteúdo. Analise o lote novamente.";
  }
  if (message.includes("stock_limit_exceeded")) {
    return "Uma quantidade ultrapassaria o limite de estoque permitido.";
  }
  if (message.includes("not_authorized")) {
    return "Sua sessão expirou. Entre novamente.";
  }
  if (message.includes("product_category_type_mismatch")) {
    return "A regra de categoria deste banco está desatualizada. Aplique a migration 0014 antes de confirmar body splashes como perfumes.";
  }
  if (
    message.includes("invalid_import_action") ||
    message.includes("create_product_with_sale_data")
  ) {
    return "A opção com preço e estoque ainda não está habilitada neste banco. Aplique a migration 0015 e tente novamente.";
  }
  if (
    message.includes("PGRST202") ||
    message.includes("confirm_bulk_product_import")
  ) {
    return "A confirmação em lote ainda não está habilitada neste banco. Aplique as migrations 0008, 0009, 0012, 0014 e 0015 antes de confirmar.";
  }
  return "Não foi possível cadastrar o lote. Nenhuma alteração foi mantida.";
}
