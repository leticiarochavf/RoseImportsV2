import type { ProductType } from "@/types/database";

export type ProductCategorySlug = "perfumes" | "cosmeticos";

/** Regra comercial única para os cadastros manual e em lote. */
export function categorySlugForProductType(
  productType: ProductType | null,
): ProductCategorySlug | null {
  if (productType === "cosmetico") return "cosmeticos";
  if (productType === "perfume" || productType === "body_splash") {
    return "perfumes";
  }
  return null;
}
