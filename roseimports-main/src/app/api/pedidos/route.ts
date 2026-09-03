import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCouponCode } from "@/lib/coupons";
import { createOrderSchema } from "@/lib/validation/schemas";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Cria o pré-pedido. (§18, §21, §34)
 *
 * O navegador manda apenas variante e quantidade. Aqui:
 *   1. relemos preço e estoque do banco;
 *   2. recusamos o pedido inteiro se algum item não couber, dizendo quais;
 *   3. recalculamos o subtotal — o valor vindo do cliente é ignorado;
 *   4. gravamos com snapshot de nome, versão e preço;
 *   5. devolvemos número e mensagem prontos.
 *
 * O cupom segue a mesma regra do preço: o navegador manda só o código
 * digitado. Quem confere validade e limite, e quem calcula o desconto a
 * partir da porcentagem guardada, é create_preorder() — dentro da mesma
 * transação que grava o pedido, então dois clientes usando o último uso
 * do mesmo cupom nunca passam do limite juntos.
 *
 * Não reserva estoque: o pagamento acontece fora do sistema. (§15)
 */

export const dynamic = "force-dynamic";

type VariantRow = {
  id: string;
  label: string;
  price_cents: number | null;
  stock_quantity: number;
  active: boolean;
  product_id: string;
  products: { name: string; active: boolean } | null;
};

/**
 * Recusa de cupom vira frase para o cliente. Devolve null quando o erro
 * não é de cupom — aí a resposta é a falha genérica, sem detalhe interno.
 *
 * A validação que vale é esta, no momento de gravar o pedido: entre
 * "aplicar cupom" na tela e clicar em finalizar, o cupom pode ter
 * expirado, esgotado ou sido desativado no painel.
 */
function translateCouponError(message: string): string | null {
  if (message.includes("coupon_not_found")) {
    return "Cupom não encontrado. Confira o código digitado.";
  }

  if (message.includes("coupon_inactive")) {
    return "Este cupom não está mais valendo.";
  }

  if (message.includes("coupon_not_started")) {
    return "Este cupom ainda não começou a valer.";
  }

  if (message.includes("coupon_expired")) {
    return "Este cupom está expirado.";
  }

  if (message.includes("coupon_exhausted")) {
    return "Este cupom atingiu o limite de usos.";
  }

  return null;
}

export type UnavailableItem = {
  variantId: string;
  productName: string;
  variantLabel: string;
  /** Quantas unidades ainda dá para levar. 0 significa esgotado. */
  available: number;
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o pedido." },
      { status: 400 },
    );
  }

  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Confira os dados do pedido." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  // Normalizado aqui e de novo no banco: "duda10" e "DUDA10" batem sempre.
  const couponCode = input.couponCode?.trim()
    ? normalizeCouponCode(input.couponCode)
    : null;

  // Soma quantidades repetidas da mesma variante antes de conferir estoque.
  const requested = new Map<string, number>();
  for (const item of input.items) {
    requested.set(
      item.variantId,
      (requested.get(item.variantId) ?? 0) + item.quantity,
    );
  }

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, label, price_cents, stock_quantity, active, product_id, products ( name, active )",
    )
    .in("id", [...requested.keys()]);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível confirmar a disponibilidade. Tente de novo." },
      { status: 500 },
    );
  }

  const variants = (data ?? []) as unknown as VariantRow[];
  const byId = new Map(variants.map((v) => [v.id, v]));

  const unavailable: UnavailableItem[] = [];
  const orderItems: {
    variant_id: string;
    product_id: string;
    product_name_snapshot: string;
    variant_label_snapshot: string;
    unit_price_cents_snapshot: number;
    quantity: number;
    subtotal_cents: number;
  }[] = [];

  // O subtotal não é somado aqui: create_preorder() refaz a conta a
  // partir dos itens, dentro da mesma transação que grava o pedido.
  for (const [variantId, quantity] of requested) {
    const variant = byId.get(variantId);

    // Variante removida ou desativada enquanto estava no carrinho.
    if (
      !variant ||
      !variant.active ||
      variant.price_cents === null ||
      !variant.products?.active
    ) {
      unavailable.push({
        variantId,
        productName: variant?.products?.name ?? "Produto",
        variantLabel: variant?.label ?? "—",
        available: 0,
      });
      continue;
    }

    if (variant.stock_quantity < quantity) {
      unavailable.push({
        variantId,
        productName: variant.products.name,
        variantLabel: variant.label,
        available: variant.stock_quantity,
      });
      continue;
    }

    const lineTotal = variant.price_cents * quantity;

    orderItems.push({
      variant_id: variant.id,
      product_id: variant.product_id,
      product_name_snapshot: variant.products.name,
      variant_label_snapshot: variant.label,
      unit_price_cents_snapshot: variant.price_cents,
      quantity,
      subtotal_cents: lineTotal,
    });
  }

  if (unavailable.length > 0) {
    return NextResponse.json(
      {
        error: "Alguns itens não estão mais disponíveis na quantidade pedida.",
        unavailable,
      },
      { status: 409 },
    );
  }

  const isDelivery = input.fulfillmentType === "entrega";

  /*
    Pedido, itens e reserva do cupom numa transação só. Se o cupom for
    recusado aqui, nenhum pedido meio-criado fica para trás — foi o que
    obrigou a compensação manual que existia antes neste ponto.
  */
  const { data: created, error: orderError } = await supabase.rpc(
    "create_preorder",
    {
      p_customer_name: input.customerName,
      p_fulfillment_type: input.fulfillmentType,
      p_neighborhood: isDelivery ? (input.neighborhood?.trim() ?? null) : null,
      p_payment_method: input.paymentMethod,
      p_items: orderItems.map((item) => ({
        variantId: item.variant_id,
        productId: item.product_id,
        productName: item.product_name_snapshot,
        variantLabel: item.variant_label_snapshot,
        unitPriceCents: item.unit_price_cents_snapshot,
        quantity: item.quantity,
      })),
      p_coupon_code: couponCode,
    },
  );

  const order = Array.isArray(created) ? created[0] : null;

  if (orderError || !order) {
    const couponError = translateCouponError(orderError?.message ?? "");

    if (couponError) {
      return NextResponse.json(
        { error: couponError, couponRejected: true },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Não foi possível gerar o pedido. Tente de novo." },
      { status: 500 },
    );
  }

  const message = buildWhatsAppMessage({
    orderNumber: order.order_number,
    customerName: input.customerName,
    fulfillmentType: input.fulfillmentType,
    neighborhood: isDelivery ? (input.neighborhood?.trim() ?? null) : null,
    // Endereço completo vai só na mensagem, para o vendedor localizar a casa.
    address: isDelivery
      ? {
          cep: input.cep?.trim() ?? "",
          street: input.street?.trim() ?? "",
          number: input.number?.trim() ?? "",
          complement: input.complement?.trim() ?? "",
          neighborhood: input.neighborhood?.trim() ?? "",
          city: input.city?.trim() ?? "",
          state: (input.state?.trim() ?? "").toUpperCase(),
        }
      : null,
    paymentMethod: input.paymentMethod,
    // Valores do pedido gravado, não os calculados aqui em cima.
    subtotalCents: order.subtotal_cents,
    coupon:
      order.coupon_code && order.coupon_discount_percent
        ? {
            code: order.coupon_code,
            discountPercent: order.coupon_discount_percent,
            discountCents: order.discount_cents,
          }
        : null,
    totalCents: order.total_cents,
    items: orderItems.map((item) => ({
      productName: item.product_name_snapshot,
      variantLabel: item.variant_label_snapshot,
      quantity: item.quantity,
      subtotalCents: item.subtotal_cents,
    })),
  });

  return NextResponse.json({
    orderNumber: order.order_number,
    subtotalCents: order.subtotal_cents,
    discountCents: order.discount_cents,
    totalCents: order.total_cents,
    couponCode: order.coupon_code,
    couponDiscountPercent: order.coupon_discount_percent,
    whatsappUrl: buildWhatsAppUrl(message),
  });
}
