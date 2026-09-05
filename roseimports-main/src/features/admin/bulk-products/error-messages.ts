export function translateBulkImportError(message: string): string {
  if (
    message.includes("products_slug_key") ||
    message.includes("duplicate key value")
  ) {
    return "Um produto desta lista já existe no catálogo. Analise o lote novamente; a linha duplicada será descartada automaticamente.";
  }
  if (message.includes("invalid_import_name")) {
    return "Há uma linha selecionada sem nome do produto. Corrija o nome ou marque a linha para não cadastrar.";
  }
  if (message.includes("invalid_import_brand")) {
    return "Há uma linha selecionada sem marca. Informe a marca ou marque a linha para não cadastrar.";
  }
  if (message.includes("invalid_import_category")) {
    return "Há uma linha selecionada sem uma categoria válida. Corrija a categoria ou marque a linha para não cadastrar.";
  }
  if (message.includes("invalid_import_product_type")) {
    return "Há uma linha selecionada sem um tipo de produto válido. Corrija o tipo ou marque a linha para não cadastrar.";
  }
  if (message.includes("invalid_import_gender")) {
    return "Há uma linha selecionada sem gênero válido. Corrija o gênero ou marque a linha para não cadastrar.";
  }
  if (message.includes("invalid_variant_label")) {
    return "Há uma linha selecionada sem volume ou identificação da versão. Corrija esses dados ou marque a linha para não cadastrar.";
  }
  if (message.includes("invalid_import_quantity")) {
    return "Há uma linha selecionada com quantidade inválida. Use um número entre 1 e 9.999 ou marque a linha para não cadastrar.";
  }
  if (message.includes("invalid_import_price")) {
    return "O preço fixo dos produtos novos deve ser R$ 300,00. Analise o lote novamente.";
  }
  if (message.includes("sale_data_requires_available_variant")) {
    return "Um produto novo não está marcado como disponível para venda. Analise o lote novamente.";
  }
  if (message.includes("imported_variant_not_found")) {
    return "A versão de um produto novo não pôde ser preparada para venda. Nenhuma alteração foi mantida; analise o lote novamente.";
  }
  if (message.includes("imported_product_not_found")) {
    return "Um produto novo não pôde ser localizado após o cadastro. Nenhuma alteração foi mantida; analise o lote novamente.";
  }
  if (message.includes("variant_not_found")) {
    return "Uma versão selecionada não existe mais no catálogo. Analise o lote novamente.";
  }
  if (message.includes("product_not_found")) {
    return "Um produto selecionado não existe mais no catálogo. Analise o lote novamente.";
  }
  if (message.includes("invalid_product_category")) {
    return "A categoria de uma linha não está ativa ou não existe. Escolha uma categoria disponível e tente novamente.";
  }
  if (message.includes("components_require_kit_variant")) {
    return "Uma linha possui componentes, mas não está marcada como kit. Corrija a composição ou marque a linha para não cadastrar.";
  }
  if (message.includes("invalid_bulk_import_result")) {
    return "O cadastro respondeu sem um resumo válido. Nenhuma nova tentativa deve ser feita antes da verificação técnica.";
  }
  if (message.includes("foreign key constraint")) {
    return "Uma categoria, família olfativa ou produto selecionado não existe mais. Analise o lote novamente para atualizar as opções.";
  }
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
