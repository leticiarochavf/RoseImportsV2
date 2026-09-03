import { describe, expect, it } from "vitest";

import { productSchema } from "@/lib/validation/schemas";

describe("nome do produto no cadastro manual", () => {
  it("normaliza o nome em maiúsculas antes de persistir", () => {
    const product = productSchema.parse({
      name: "Café Árabe “Abelha”",
      slug: "cafe-arabe-abelha",
      brand: "",
      categoryId: "90000000-0000-4000-8000-000000000001",
      productType: "perfume",
      gender: "",
      olfactoryFamilyId: "",
      description: "",
      active: false,
      featured: false,
      promotional: false,
    });

    expect(product.name).toBe("CAFÉ ÁRABE - ABELHA");
  });
});
