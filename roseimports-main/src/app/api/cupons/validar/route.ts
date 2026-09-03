import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeDiscountCents,
  couponAvailability,
  isValidCouponCode,
  normalizeCouponCode,
} from "@/lib/coupons";

/**
 * Prévia do cupom na tela do checkout.
 *
 * Só lê: não reserva uso nem segura vaga nenhuma. O que vale é a
 * conferência feita na hora de gravar o pedido, dentro de
 * create_preorder() — entre esta resposta e o clique em finalizar, o
 * cupom pode expirar, esgotar ou ser desativado no painel.
 *
 * Mesmo sendo prévia, o percentual vem do banco. O navegador nunca
 * informa quanto vale o desconto.
 */

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  code: z.string().trim().min(1).max(24),
  subtotalCents: z.number().int().min(0).max(100_000_000),
});

const REJECTION_MESSAGE = {
  inativo: "Este cupom não está mais valendo.",
  agendado: "Este cupom ainda não começou a valer.",
  expirado: "Este cupom está expirado.",
  esgotado: "Este cupom atingiu o limite de usos.",
} as const;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Confira o código digitado." },
      { status: 400 },
    );
  }

  const code = normalizeCouponCode(parsed.data.code);

  // Formato errado nem chega ao banco.
  if (!isValidCouponCode(code)) {
    return NextResponse.json(
      { valid: false, error: "Cupom não encontrado. Confira o código digitado." },
      { status: 200 },
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("coupons")
    .select(
      "code, discount_percent, active, starts_at, expires_at, max_uses, uses_reserved",
    )
    .eq("code", code)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível conferir o cupom agora." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { valid: false, error: "Cupom não encontrado. Confira o código digitado." },
      { status: 200 },
    );
  }

  const availability = couponAvailability({
    active: data.active,
    startsAt: data.starts_at,
    expiresAt: data.expires_at,
    maxUses: data.max_uses,
    usesReserved: data.uses_reserved,
  });

  if (availability !== "disponivel") {
    return NextResponse.json(
      { valid: false, error: REJECTION_MESSAGE[availability] },
      { status: 200 },
    );
  }

  return NextResponse.json({
    valid: true,
    code: data.code,
    discountPercent: data.discount_percent,
    discountCents: computeDiscountCents(
      parsed.data.subtotalCents,
      data.discount_percent,
    ),
  });
}
