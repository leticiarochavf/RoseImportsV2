export type { Gender, ProductType } from "@/types/database";
export type { StockStatus as StockStatusLike } from "@/lib/stock";

/** Formato reduzido usado nos filtros e na navegação. */
export type Category = { id: string; name: string; slug: string };
export type OlfactoryFamily = Category;
