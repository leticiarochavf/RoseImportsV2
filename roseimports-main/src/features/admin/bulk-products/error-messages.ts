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
    return "Este tipo de produto ainda não pode ser cadastrado em lote. Peça ao responsável técnico para atualizar o cadastro em lote e tente novamente.";
  }
  if (
    message.includes("invalid_import_action") ||
    message.includes("create_product_with_sale_data")
  ) {
    return "A opção de cadastrar com preço e estoque ainda não está disponível. Peça ao responsável técnico para atualizar o cadastro em lote.";
  }
  if (
    message.includes("PGRST202") ||
    message.includes("confirm_bulk_product_import")
  ) {
    return "A confirmação do cadastro em lote ainda não está disponível. Peça ao responsável técnico para concluir a configuração antes de tentar novamente.";
  }
  return "Não foi possível cadastrar o lote. Nenhuma alteração foi mantida.";
}
