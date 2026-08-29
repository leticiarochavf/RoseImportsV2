import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
 * Não reserva estoque: o pagamento acontece fora do sistema. (§15)
 */

export const dynamic = "force-dynamic";

type VariantRow = {
  id: string;
  label: string;
  price_cents: number;
  stock_quantity: number;
  active: boolean;
  product_id: string;
  products: { name: string; active: boolean } | null;
};

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

  let subtotalCents = 0;

  for (const [variantId, quantity] of requested) {
    const variant = byId.get(variantId);

    // Variante removida ou desativada enquanto estava no carrinho.
    if (!variant || !variant.active || !variant.products?.active) {
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
    subtotalCents += lineTotal;

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

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: input.customerName,
      fulfillment_type: input.fulfillmentType,
      neighborhood: isDelivery ? (input.neighborhood?.trim() ?? null) : null,
      payment_method: input.paymentMethod,
      subtotal_cents: subtotalCents,
      status: "novo",
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: "Não foi possível gerar o pedido. Tente de novo." },
      { status: 500 },
    );
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    // Pedido sem itens não serve para nada e sujaria as métricas.
    await supabase.from("orders").delete().eq("id", order.id);
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
    subtotalCents,
    items: orderItems.map((item) => ({
      productName: item.product_name_snapshot,
      variantLabel: item.variant_label_snapshot,
      quantity: item.quantity,
      subtotalCents: item.subtotal_cents,
    })),
  });

  return NextResponse.json({
    orderNumber: order.order_number,
    subtotalCents,
    whatsappUrl: buildWhatsAppUrl(message),
  });
}
