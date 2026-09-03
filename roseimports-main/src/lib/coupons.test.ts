import { describe, expect, it } from "vitest";

import {
  computeDiscountCents,
  couponAvailability,
  isValidCouponCode,
  normalizeCouponCode,
  type CouponWindow,
} from "./coupons";

function coupon(overrides: Partial<CouponWindow> = {}): CouponWindow {
  return {
    active: true,
    startsAt: null,
    expiresAt: null,
    maxUses: null,
    usesReserved: 0,
    ...overrides,
  };
}

describe("normalizeCouponCode", () => {
  it("iguala variações de caixa e espaço nas pontas", () => {
    const esperado = "DUDA10";

    for (const entrada of [" duda10 ", "DUDA10", "Duda10", "\tduda10\n"]) {
      expect(normalizeCouponCode(entrada)).toBe(esperado);
    }
  });

  it("aceita código com hífen e recusa espaço no meio", () => {
    expect(isValidCouponCode(" rose-verao ")).toBe(true);
    expect(isValidCouponCode("DUDA 10")).toBe(false);
  });

  it("recusa código curto demais, longo demais ou com símbolo", () => {
    expect(isValidCouponCode("ab")).toBe(false);
    expect(isValidCouponCode("A".repeat(25))).toBe(false);
    expect(isValidCouponCode("DUDA@10")).toBe(false);
  });
});

describe("computeDiscountCents", () => {
  it("aplica o percentual sobre o subtotal", () => {
    expect(computeDiscountCents(10_000, 10)).toBe(1_000);
    expect(computeDiscountCents(12_990, 15)).toBe(1_949); // 1948,5 → meio para cima
  });

  it("100% zera o pedido sem passar do subtotal", () => {
    expect(computeDiscountCents(12_990, 100)).toBe(12_990);
  });

  it("ignora percentual fora da faixa aceita pelo banco", () => {
    expect(computeDiscountCents(10_000, 0)).toBe(0);
    expect(computeDiscountCents(10_000, 101)).toBe(0);
    expect(computeDiscountCents(10_000, 10.5)).toBe(0);
  });
});

describe("couponAvailability", () => {
  const agora = new Date("2026-06-15T12:00:00.000Z");

  it("cupom sem prazo e sem limite está disponível", () => {
    expect(couponAvailability(coupon(), agora)).toBe("disponivel");
  });

  it("reconhece inativo, agendado, expirado e esgotado", () => {
    expect(couponAvailability(coupon({ active: false }), agora)).toBe("inativo");

    expect(
      couponAvailability(coupon({ startsAt: "2026-07-01T00:00:00.000Z" }), agora),
    ).toBe("agendado");

    expect(
      couponAvailability(coupon({ expiresAt: "2026-06-01T00:00:00.000Z" }), agora),
    ).toBe("expirado");

    expect(
      couponAvailability(coupon({ maxUses: 20, usesReserved: 20 }), agora),
    ).toBe("esgotado");
  });

  it("conta o limite pela reserva, não pelo pedido pago", () => {
    // 20 pré-pedidos feitos, nenhum pago ainda: o cupom já acabou.
    expect(
      couponAvailability(coupon({ maxUses: 20, usesReserved: 20 }), agora),
    ).toBe("esgotado");

    expect(
      couponAvailability(coupon({ maxUses: 20, usesReserved: 19 }), agora),
    ).toBe("disponivel");
  });
});
