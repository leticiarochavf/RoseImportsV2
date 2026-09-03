import { describe, expect, it, vi } from "vitest";

import { confirmBulkProductImport } from "./import-service";

const request = {
  idempotencyKey: "30000000-0000-4000-8000-000000000001",
  payloadHash: "sha256:example",
  items: [
    {
      action: "increment_existing_variant" as const,
      quantity: 2,
      variantId: "20000000-0000-4000-8000-000000000001",
      name: "Lattafa Jasoor",
      brand: "Lattafa",
      categoryId: "90000000-0000-4000-8000-000000000001",
      productType: "perfume" as const,
      gender: "masculino" as const,
    },
  ],
};

describe("confirmBulkProductImport", () => {
  it("confirma o lote inteiro por uma única RPC transacional", async () => {
    const summary = {
      productsCreated: 0,
      variantsCreated: 0,
      existingVariantsUpdated: 1,
      unitsAdded: 2,
    };
    const rpc = vi.fn().mockResolvedValue({ data: summary, error: null });

    await expect(confirmBulkProductImport({ rpc }, request)).resolves.toEqual(
      summary,
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("confirm_bulk_product_import", {
      p_idempotency_key: request.idempotencyKey,
      p_payload_hash: request.payloadHash,
      p_items: request.items,
    });
  });

  it("propaga falha da RPC sem tentar gravações parciais alternativas", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "forced_mid_import_failure" },
    });

    await expect(confirmBulkProductImport({ rpc }, request)).rejects.toThrow(
      "forced_mid_import_failure",
    );
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("envia a mesma chave e hash em uma repetição idempotente", async () => {
    const storedSummary = {
      productsCreated: 1,
      variantsCreated: 1,
      existingVariantsUpdated: 0,
      unitsAdded: 3,
    };
    const rpc = vi.fn().mockResolvedValue({
      data: storedSummary,
      error: null,
    });
    const client = { rpc };

    const first = await confirmBulkProductImport(client, request);
    const repeated = await confirmBulkProductImport(client, request);

    expect(first).toEqual(storedSummary);
    expect(repeated).toEqual(storedSummary);
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
  });
});
