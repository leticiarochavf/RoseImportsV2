import type { MetadataRoute } from "next";
import { getProductSlugs } from "@/features/catalog/queries";
import { site } from "@/lib/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/catalogo",
    "/sobre",
    "/contato",
    "/faq",
    "/privacidade",
    "/trocas-e-devolucoes",
    "/politica-de-entrega",
    "/termos-de-uso",
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getProductSlugs();
    productRoutes = slugs.map((slug) => ({ url: `${site.url}/produto/${slug}`, changeFrequency: "weekly", priority: 0.7 }));
  } catch {
    productRoutes = [];
  }

  return [
    ...staticRoutes.map((route) => ({
      url: `${site.url}${route}`,
      changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
      priority: route === "" ? 1 : route === "/catalogo" ? 0.9 : 0.5,
    })),
    ...productRoutes,
  ];
}
