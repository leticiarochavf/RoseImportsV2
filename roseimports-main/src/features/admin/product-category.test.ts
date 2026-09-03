import { describe, expect, it } from "vitest";

import { categorySlugForProductType } from "@/lib/product-category";

describe("categoria comercial do produto", () => {
  it("usa cosméticos somente para cosmético/body cream", () => {
    expect(categorySlugForProductType("cosmetico")).toBe("cosmeticos");
  });

  it("usa perfumes para perfume e body splash", () => {
    expect(categorySlugForProductType("perfume")).toBe("perfumes");
    expect(categorySlugForProductType("body_splash")).toBe("perfumes");
  });
});
