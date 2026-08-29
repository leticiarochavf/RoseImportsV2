"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";
import {
  priceUpdateSchema,
  productSchema,
  statusUpdateSchema,
  stockUpdateSchema,
  variantSchema,
} from "@/lib/validation/schemas";
import { parseCurrencyToCents } from "@/lib/money";
import { slugify } from "@/lib/slug";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Toda ação passa por aqui. Exige sessão E perfil — a mesma regra do
 * is_admin() das policies. As policies continuam sendo a barreira final;
 * esta checagem corta antes, com mensagem clara em vez de erro cru.
 */
async function requireAdmin() {
  await requireAdminUser();
  return createClient();
}

/* =============================================================
   Pedidos
   ============================================================= */

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  const parsed = statusUpdateSchema.safeParse({ orderId, status });
  if (!parsed.success) return { ok: false, error: "Status inválido." };

  const supabase = await requireAdmin();

  // "Pago" nunca é um UPDATE direto: a função baixa o estoque na mesma
  // transação e ignora chamadas repetidas. (§23)
  if (parsed.data.status === "pago") {
    const { data, error } = await supabase.rpc("mark_order_paid", {
      p_order_id: parsed.data.orderId,
    });

    if (error) return { ok: false, error: translateDbError(error.message) };

    const result = Array.isArray(data) ? data[0] : null;

    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
    revalidatePath("/admin/estoque");
    revalidatePath("/admin");

    return {
      ok: true,
      message: result?.already_paid
        ? "Este pedido já estava pago. O estoque não foi alterado de novo."
        : "Pedido marcado como pago e estoque atualizado.",
    };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin");

  return { ok: true, message: "Status atualizado." };
}

/* =============================================================
   Estoque e preço
   ============================================================= */

export async function updateVariantStock(
  variantId: string,
  stockQuantity: number,
): Promise<ActionResult> {
  const parsed = stockUpdateSchema.safeParse({ variantId, stockQuantity });
  if (!parsed.success) {
    return { ok: false, error: "Informe um número inteiro de 0 a 9999." };
  }

  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("product_variants")
    .update({ stock_quantity: parsed.data.stockQuantity })
    .eq("id", parsed.data.variantId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath("/admin/estoque");
  revalidatePath("/catalogo");

  return { ok: true, message: "Estoque atualizado." };
}

export async function updateVariantPrice(
  variantId: string,
  priceInput: string,
): Promise<ActionResult> {
  const cents = parseCurrencyToCents(priceInput);
  if (cents === null || cents <= 0) {
    return { ok: false, error: "Informe um preço válido, como 249,90." };
  }

  const parsed = priceUpdateSchema.safeParse({ variantId, priceCents: cents });
  if (!parsed.success) return { ok: false, error: "Preço fora do limite." };

  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("product_variants")
    .update({ price_cents: parsed.data.priceCents })
    .eq("id", parsed.data.variantId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath("/admin/estoque");
  revalidatePath("/catalogo");

  return { ok: true, message: "Preço atualizado." };
}

/* =============================================================
   Produtos
   ============================================================= */

function readProductForm(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const slugRaw = String(formData.get("slug") ?? "");

  return {
    name,
    slug: slugRaw.trim() ? slugify(slugRaw) : slugify(name),
    brand: String(formData.get("brand") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    productType: String(formData.get("productType") ?? ""),
    gender: String(formData.get("gender") ?? ""),
    olfactoryFamilyId: String(formData.get("olfactoryFamilyId") ?? ""),
    description: String(formData.get("description") ?? ""),
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
    promotional: formData.get("promotional") === "on",
  };
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await requireAdmin();
  const input = parsed.data;

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      slug: input.slug,
      brand: input.brand,
      category_id: input.categoryId,
      product_type: input.productType,
      gender: input.gender,
      olfactory_family_id: input.olfactoryFamilyId,
      description: input.description,
      active: input.active,
      featured: input.featured,
      promotional: input.promotional,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: translateDbError(error?.message ?? "") };
  }

  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${data.id}?criado=1`);
}

export async function updateProduct(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await requireAdmin();
  const input = parsed.data;

  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      slug: input.slug,
      brand: input.brand,
      category_id: input.categoryId,
      product_type: input.productType,
      gender: input.gender,
      olfactory_family_id: input.olfactoryFamilyId,
      description: input.description,
      active: input.active,
      featured: input.featured,
      promotional: input.promotional,
    })
    .eq("id", productId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/catalogo");
  revalidatePath(`/produto/${input.slug}`);

  return { ok: true, message: "Produto salvo." };
}

/** Produto nunca é excluído: só desativado. (§30) */
export async function toggleProductActive(
  productId: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", productId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath("/admin/produtos");
  revalidatePath("/catalogo");

  return {
    ok: true,
    message: active
      ? "Produto ativado e visível no catálogo."
      : "Produto desativado. Ele sai do catálogo, mas continua nos pedidos antigos.",
  };
}

/**
 * Exclusão definitiva do produto. Diferente de desativar: some do banco.
 * Só é permitida enquanto o produto não tiver vendas — o histórico de
 * pedidos vem primeiro. As versões e imagens saem em cascata (FK); os
 * arquivos do storage são limpos aqui. (§30)
 */
export async function deleteProduct(productId: string): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Este produto já teve vendas. Desative-o em vez de excluir, para preservar os pedidos antigos.",
    };
  }

  // Guarda os caminhos das imagens antes de o cascade apagar os registros.
  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId);

  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  if (images && images.length > 0) {
    // Arquivo órfão não aparece em lugar nenhum; falha aqui não desfaz a exclusão.
    await supabase.storage
      .from("product-images")
      .remove(images.map((i) => i.storage_path));
  }

  revalidatePath("/admin/produtos");
  revalidatePath("/admin/estoque");
  revalidatePath("/catalogo");

  return { ok: true, message: "Produto excluído." };
}

export async function toggleProductFlag(
  productId: string,
  field: "featured" | "promotional",
  value: boolean,
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const patch =
    field === "featured" ? { featured: value } : { promotional: value };

  const { error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath("/admin/produtos");
  revalidatePath("/");

  return { ok: true, message: "Produto atualizado." };
}

/* =============================================================
   Variantes
   ============================================================= */

export async function saveVariant(
  productId: string,
  variantId: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const priceCents = parseCurrencyToCents(String(formData.get("price") ?? ""));
  if (priceCents === null) {
    return { ok: false, error: "Informe um preço válido, como 249,90." };
  }

  const volumeRaw = String(formData.get("volumeMl") ?? "").trim();

  const parsed = variantSchema.safeParse({
    label: String(formData.get("label") ?? ""),
    volumeMl: volumeRaw === "" ? null : Number(volumeRaw),
    variantType: String(formData.get("variantType") ?? "full"),
    priceCents,
    stockQuantity: Number(formData.get("stockQuantity") ?? 0),
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await requireAdmin();
  const input = parsed.data;

  const payload = {
    product_id: productId,
    label: input.label,
    volume_ml: input.volumeMl,
    variant_type: input.variantType,
    price_cents: input.priceCents,
    stock_quantity: input.stockQuantity,
    active: input.active,
    sort_order: input.sortOrder,
  };

  const { error } = variantId
    ? await supabase.from("product_variants").update(payload).eq("id", variantId)
    : await supabase.from("product_variants").insert(payload);

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/admin/estoque");
  revalidatePath("/catalogo");

  return { ok: true, message: variantId ? "Versão salva." : "Versão criada." };
}

/**
 * Versão some do site ao ser desativada. A exclusão só é permitida
 * quando nenhum pedido a referencia — o histórico vem primeiro.
 */
export async function deleteVariant(
  productId: string,
  variantId: string,
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("variant_id", variantId);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Esta versão já foi vendida. Desative-a em vez de excluir, para não afetar os pedidos antigos.",
    };
  }

  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/admin/estoque");

  return { ok: true, message: "Versão removida." };
}

/* =============================================================
   Imagens
   ============================================================= */

export async function addProductImage(
  productId: string,
  storagePath: string,
  altText: string,
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    alt_text: altText || null,
    sort_order: count ?? 0,
  });

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");

  return { ok: true, message: "Imagem adicionada." };
}

export async function setProductCover(
  productId: string,
  imageId: string,
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { data, error } = await supabase
    .from("product_images")
    .select("id, sort_order")
    .eq("product_id", productId)
    .order("sort_order");

  if (error) return { ok: false, error: translateDbError(error.message) };

  const rows = data ?? [];
  if (!rows.some((image) => image.id === imageId)) {
    return { ok: false, error: "Imagem não encontrada." };
  }

  const ordered = [
    ...rows.filter((image) => image.id === imageId),
    ...rows.filter((image) => image.id !== imageId),
  ];

  for (const [index, image] of ordered.entries()) {
    const { error: updateError } = await supabase
      .from("product_images")
      .update({ sort_order: index })
      .eq("id", image.id);

    if (updateError) {
      return { ok: false, error: translateDbError(updateError.message) };
    }
  }

  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");

  return { ok: true, message: "Capa atualizada." };
}

export async function removeProductImage(
  productId: string,
  imageId: string,
  storagePath: string,
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  // Falha ao apagar o arquivo não invalida a operação: o registro já saiu
  // e o arquivo órfão não aparece em lugar nenhum.
  await supabase.storage.from("product-images").remove([storagePath]);

  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");

  return { ok: true, message: "Imagem removida." };
}

/* =============================================================
   Sessão
   ============================================================= */

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* =============================================================
   Erros do banco em linguagem de gente
   ============================================================= */

function translateDbError(message: string): string {
  if (message.includes("insufficient_stock")) {
    const item = message.split("insufficient_stock:")[1]?.trim();
    return `Estoque insuficiente${item ? ` para ${item}` : ""}. Atualize o estoque antes de marcar como pago.`;
  }
  if (message.includes("order_already_paid")) {
    return "Este pedido já foi pago. Só é possível marcá-lo como entregue ou retirado.";
  }
  if (message.includes("order_cancelled_is_final")) {
    return "Pedido cancelado não pode voltar atrás.";
  }
  if (message.includes("order_cancelled")) {
    return "Pedido cancelado não pode ser marcado como pago.";
  }
  if (message.includes("cannot_unpay")) {
    return "Não é possível desfazer o pagamento de um pedido.";
  }
  if (message.includes("use_mark_order_paid")) {
    return "Use o botão Marcar como pago para dar baixa no estoque.";
  }
  if (message.includes("variant_removed")) {
    return "Uma das versões do pedido não existe mais. Ajuste o cadastro antes de dar baixa.";
  }
  if (message.includes("duplicate key") && message.includes("slug")) {
    return "Já existe um produto com esse endereço. Escolha outro.";
  }
  if (message.includes("not_authorized")) {
    return "Sua sessão expirou. Entre de novo.";
  }
  return "Não foi possível concluir a operação. Tente de novo.";
}
