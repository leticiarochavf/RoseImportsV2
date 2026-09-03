import { describe, expect, it } from "vitest";

import { buildWhatsAppMessage, type WhatsAppOrder } from "./whatsapp";

function order(overrides: Partial<WhatsAppOrder> = {}): WhatsAppOrder {
  return {
    orderNumber: "RI-1000",
    customerName: "Duda",
    fulfillmentType: "retirada",
    neighborhood: null,
    address: null,
    paymentMethod: "pix",
    subtotalCents: 20_000,
    coupon: null,
    totalCents: 20_000,
    items: [
      {
        productName: "Lattafa Jasoor",
        variantLabel: "EDP 100 ml",
        quantity: 1,
        subtotalCents: 20_000,
      },
    ],
    ...overrides,
  };
}

describe("buildWhatsAppMessage", () => {
  it("sem cupom, mostra só o subtotal", () => {
    const message = buildWhatsAppMessage(order());

    expect(message).toContain("Subtotal: R$ 200,00");
    expect(message).not.toContain("Cupom");
    expect(message).not.toContain("Total:");
  });

  it("com cupom, mostra subtotal, desconto e total", () => {
    const message = buildWhatsAppMessage(
      order({
        coupon: { code: "DUDA10", discountPercent: 10, discountCents: 2_000 },
        totalCents: 18_000,
      }),
    );

    expect(message).toContain("Subtotal: R$ 200,00");
    expect(message).toContain("Cupom DUDA10 (10%): -R$ 20,00");
    expect(message).toContain("Total: R$ 180,00");
  });
});
