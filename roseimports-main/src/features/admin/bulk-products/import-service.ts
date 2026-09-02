export type CreateProductImportItem = {
  action: "create_inactive_product";
  quantity: number;
  name: string;
  slug: string;
  brand: string | null;
  categoryId: string;
  productType: "perfume" | "body_splash" | "cosmetico";
  variantLabel: string;
  concentration: "EDP" | "EDT" | "Parfum" | null;
  volumeMl: number | null;
  variantType: "full" | "decant";
  isKit: boolean;
  components: Array<{
    type: string;
    name: string | null;
    volumeMl: number | null;
    quantity: number | null;
  }>;
};

export type CreateVariantImportItem = Omit<
  CreateProductImportItem,
  "action" | "name" | "slug" | "brand" | "categoryId" | "productType"
> & {
  action: "create_inactive_variant";
  productId: string;
};

export type IncrementVariantImportItem = {
  action: "increment_existing_variant";
  quantity: number;
  variantId: string;
};

export type ConfirmBulkProductImportItem =
  | CreateProductImportItem
  | CreateVariantImportItem
  | IncrementVariantImportItem;

export type ConfirmBulkProductImportRequest = {
  idempotencyKey: string;
  payloadHash: string;
  items: ConfirmBulkProductImportItem[];
};

export type BulkProductImportSummary = {
  productsCreated: number;
  variantsCreated: number;
  existingVariantsUpdated: number;
  unitsAdded: number;
};

type RpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export type BulkProductImportRpcClient = {
  rpc: (
    functionName: "confirm_bulk_product_import",
    args: {
      p_idempotency_key: string;
      p_payload_hash: string;
      p_items: ConfirmBulkProductImportItem[];
    },
  ) => PromiseLike<RpcResult>;
};

export async function confirmBulkProductImport(
  client: BulkProductImportRpcClient,
  request: ConfirmBulkProductImportRequest,
): Promise<BulkProductImportSummary> {
  const { data, error } = await client.rpc("confirm_bulk_product_import", {
    p_idempotency_key: request.idempotencyKey,
    p_payload_hash: request.payloadHash,
    p_items: request.items,
  });

  if (error) throw new Error(error.message);
  if (!isImportSummary(data)) throw new Error("invalid_bulk_import_result");
  return data;
}

function isImportSummary(value: unknown): value is BulkProductImportSummary {
  if (!value || typeof value !== "object") return false;

  const summary = value as Record<string, unknown>;
  return [
    "productsCreated",
    "variantsCreated",
    "existingVariantsUpdated",
    "unitsAdded",
  ].every((key) => typeof summary[key] === "number");
}
