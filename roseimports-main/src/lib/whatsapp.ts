import { contact, delivery } from "@/lib/config/site";
import { formatCentsPlain } from "@/lib/money";
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from "@/lib/labels";
import type { FulfillmentType, PaymentMethod } from "@/types/database";

export type DeliveryAddress = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type WhatsAppOrder = {
  orderNumber: string;
  customerName: string;
  fulfillmentType: FulfillmentType;
  neighborhood: string | null;
  /** Endereço completo para entrega — só na mensagem, não gravado. */
  address: DeliveryAddress | null;
  paymentMethod: PaymentMethod;
  subtotalCents: number;
  /** Cupom aplicado, já validado e calculado pelo banco. */
  coupon: {
    code: string;
    discountPercent: number;
    discountCents: number;
  } | null;
  /** Subtotal menos o desconto. Sem cupom, é igual ao subtotal. */
  totalCents: number;
  items: {
    productName: string;
    variantLabel: string;
    quantity: number;
    subtotalCents: number;
  }[];
};

function formatCep(cep: string): string {
  const d = cep.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep;
}

/**
 * Mensagem completa para o atendimento não precisar repetir pergunta
 * básica: o que, quanto, para quem, como recebe e como paga. (§20)
 */
export function buildWhatsAppMessage(order: WhatsAppOrder): string {
  const lines: string[] = [
    "Olá! Gostaria de finalizar meu pedido na Rose Imports.",
    "",
    `Pedido: #${order.orderNumber}`,
    "",
    "Itens:",
  ];

  for (const item of order.items) {
    lines.push(`• ${item.productName} — ${item.variantLabel}`);
    lines.push(`  ${item.quantity}x — R$ ${formatCentsPlain(item.subtotalCents)}`);
  }

  lines.push("");
  lines.push(`Subtotal: R$ ${formatCentsPlain(order.subtotalCents)}`);

  // Com cupom, o atendimento precisa ver as três linhas: o que era, o
  // que saiu de desconto e o que ficou.
  if (order.coupon) {
    lines.push(
      `Cupom ${order.coupon.code} (${order.coupon.discountPercent}%): -R$ ${formatCentsPlain(
        order.coupon.discountCents,
      )}`,
    );
    lines.push(`Total: R$ ${formatCentsPlain(order.totalCents)}`);
  }

  lines.push("");
  lines.push(`Nome: ${order.customerName}`);
  lines.push(`Recebimento: ${FULFILLMENT_LABEL[order.fulfillmentType]}`);

  if (order.fulfillmentType === "entrega" && order.address) {
    const a = order.address;
    const rua = a.number ? `${a.street}, ${a.number}` : a.street;

    lines.push("");
    lines.push("Endereço de entrega:");
    lines.push(`  ${rua}`);
    if (a.complement) lines.push(`  Complemento: ${a.complement}`);
    lines.push(`  Bairro: ${a.neighborhood}`);
    lines.push(`  ${a.city} - ${a.state}`);
    lines.push(`  CEP: ${formatCep(a.cep)}`);
    lines.push("");
  } else if (order.fulfillmentType === "entrega" && order.neighborhood) {
    lines.push(`Bairro: ${order.neighborhood}`);
  }

  lines.push(`Forma de pagamento: ${PAYMENT_LABEL[order.paymentMethod]}`);
  lines.push("");

  lines.push(
    order.fulfillmentType === "entrega"
      ? "Aguardo a confirmação da disponibilidade, taxa de entrega e horário."
      : "Aguardo a confirmação da disponibilidade e do horário para retirada.",
  );

  if (order.paymentMethod === "cartao") {
    lines.push("");
    lines.push("Gostaria de saber as condições de parcelamento no cartão.");
  }

  return lines.join("\n");
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** Link de conversa direta, sem pedido. Usado no header e no rodapé. */
export function whatsappContactUrl(text?: string): string {
  const message =
    text ?? "Olá! Vim pelo site da Rose Imports e gostaria de tirar uma dúvida.";
  return buildWhatsAppUrl(message);
}

export { delivery };
