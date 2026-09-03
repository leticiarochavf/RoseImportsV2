"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  couponSchema,
  influencerSchema,
  type CouponInput,
  type InfluencerInput,
} from "./schemas";

export type ActionResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; error: string };

async function requireAdmin() {
  await requireAdminUser();
  return createClient();
}

function revalidateCoupons() {
  revalidatePath("/admin/cupons");
  revalidatePath("/admin/influenciadores");
}

/**
 * Erro do banco vira frase de gente. As constraints da 0010 são a última
 * barreira: quando uma delas dispara, a mensagem precisa dizer o que
 * fazer, não repetir o nome da constraint.
 */
function translateCouponError(message: string): string {
  if (message.includes("uq_coupons_code")) {
    return "Já existe um cupom com esse código. Códigos não são reaproveitados, nem os de cupons desativados.";
  }

  if (message.includes("chk_coupon_reserved_le_max")) {
    return "O novo limite é menor que a quantidade de usos já registrados. Use um limite igual ou maior.";
  }

  if (message.includes("chk_coupon_period")) {
    return "A validade precisa terminar depois do início.";
  }

  if (message.includes("chk_coupon_code_normalized")) {
    return "Código fora do formato aceito: de 3 a 24 caracteres, entre letras, números e hífen.";
  }

  if (message.includes("discount_percent")) {
    return "A porcentagem de desconto precisa ficar entre 1 e 100.";
  }

  if (message.includes("violates foreign key") && message.includes("influencer")) {
    return "Influenciador não encontrado. Atualize a página e tente de novo.";
  }

  return "Não foi possível salvar. Tente de novo.";
}

/* =============================================================
   CUPONS
============================================================= */

function readCouponForm(formData: FormData) {
  return {
    code: String(formData.get("code") ?? ""),
    discountPercent: formData.get("discountPercent"),
    influencerId: formData.get("influencerId"),
    startsAt: formData.get("startsAt"),
    expiresAt: formData.get("expiresAt"),
    maxUses: formData.get("maxUses"),
    showInShowcase: formData.get("showInShowcase") === "on",
    active: formData.get("active") === "on",
  };
}

function toCouponRow(input: CouponInput) {
  return {
    code: input.code,
    discount_percent: input.discountPercent,
    influencer_id: input.influencerId,
    starts_at: input.startsAt,
    expires_at: input.expiresAt,
    max_uses: input.maxUses,
    show_in_showcase: input.showInShowcase,
    active: input.active,
  };
}

export async function createCoupon(formData: FormData): Promise<ActionResult> {
  const parsed = couponSchema.safeParse(readCouponForm(formData));

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await requireAdmin();

  const { data, error } = await supabase
    .from("coupons")
    .insert(toCouponRow(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: translateCouponError(error?.message ?? "") };
  }

  revalidateCoupons();

  return { ok: true, message: "Cupom criado.", id: data.id };
}

export async function updateCoupon(
  couponId: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = couponSchema.safeParse(readCouponForm(formData));

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await requireAdmin();

  /*
    Contador de uso nunca entra no update: quem mexe nele é a transação
    do pedido. Editar um cupom não pode reescrever histórico de venda.
  */
  const { error } = await supabase
    .from("coupons")
    .update(toCouponRow(parsed.data))
    .eq("id", couponId);

  if (error) {
    return { ok: false, error: translateCouponError(error.message) };
  }

  revalidateCoupons();
  revalidatePath(`/admin/cupons/${couponId}`);

  return { ok: true, message: "Cupom salvo.", id: couponId };
}

/** Desativar é o "excluir" de um cupom que já rodou. O histórico fica. */
export async function setCouponActive(
  couponId: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("coupons")
    .update({ active })
    .eq("id", couponId);

  if (error) {
    return { ok: false, error: translateCouponError(error.message) };
  }

  revalidateCoupons();
  revalidatePath(`/admin/cupons/${couponId}`);

  return {
    ok: true,
    message: active ? "Cupom reativado." : "Cupom desativado.",
  };
}

/**
 * Exclusão física só para cupom que nunca foi usado. Se algum pedido
 * aponta para ele, apagar levaria junto o vínculo do relatório — nesse
 * caso a resposta é desativar, e a tela diz isso.
 */
export async function deleteCoupon(couponId: string): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { count, error: countError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", couponId);

  if (countError) {
    return {
      ok: false,
      error: "Não foi possível conferir os pedidos do cupom.",
    };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Este cupom já foi usado em pedidos. Desative-o: assim ele para de valer no checkout e o histórico continua inteiro.",
    };
  }

  // A condição no WHERE fecha a corrida com um pedido entrando agora.
  const { data, error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", couponId)
    .eq("uses_reserved", 0)
    .select("id");

  if (error) {
    return { ok: false, error: "Não foi possível excluir o cupom." };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error:
        "O cupom foi usado enquanto a página estava aberta. Atualize e desative-o em vez de excluir.",
    };
  }

  revalidateCoupons();

  return { ok: true, message: "Cupom excluído." };
}

/* =============================================================
   INFLUENCIADORES
============================================================= */

function readInfluencerForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    handle: formData.get("handle"),
    notes: formData.get("notes"),
    active: formData.get("active") === "on",
  };
}

function toInfluencerRow(input: InfluencerInput) {
  return {
    name: input.name,
    handle: input.handle,
    notes: input.notes,
    active: input.active,
  };
}

export async function createInfluencer(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = influencerSchema.safeParse(readInfluencerForm(formData));

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await requireAdmin();

  const { data, error } = await supabase
    .from("influencers")
    .insert(toInfluencerRow(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Não foi possível salvar o influenciador." };
  }

  revalidateCoupons();

  return { ok: true, message: "Influenciador criado.", id: data.id };
}

export async function updateInfluencer(
  influencerId: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = influencerSchema.safeParse(readInfluencerForm(formData));

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("influencers")
    .update(toInfluencerRow(parsed.data))
    .eq("id", influencerId);

  if (error) {
    return { ok: false, error: "Não foi possível salvar o influenciador." };
  }

  revalidateCoupons();
  revalidatePath(`/admin/influenciadores/${influencerId}`);

  return { ok: true, message: "Influenciador salvo.", id: influencerId };
}

export async function setInfluencerActive(
  influencerId: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from("influencers")
    .update({ active })
    .eq("id", influencerId);

  if (error) {
    return { ok: false, error: "Não foi possível alterar o influenciador." };
  }

  revalidateCoupons();

  return {
    ok: true,
    message: active ? "Influenciador reativado." : "Influenciador arquivado.",
  };
}

/**
 * Só some de verdade quem nunca teve cupom. A FK é `on delete restrict`
 * de propósito: apagar alguém com cupom apagaria a atribuição da venda.
 */
export async function deleteInfluencer(
  influencerId: string,
): Promise<ActionResult> {
  const supabase = await requireAdmin();

  const { count, error: countError } = await supabase
    .from("coupons")
    .select("id", { count: "exact", head: true })
    .eq("influencer_id", influencerId);

  if (countError) {
    return { ok: false, error: "Não foi possível conferir os cupons." };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Este influenciador tem cupons vinculados. Arquive-o para tirá-lo da lista sem perder a atribuição das vendas.",
    };
  }

  const { error } = await supabase
    .from("influencers")
    .delete()
    .eq("id", influencerId);

  if (error) {
    return { ok: false, error: "Não foi possível excluir o influenciador." };
  }

  revalidateCoupons();

  return { ok: true, message: "Influenciador excluído." };
}
