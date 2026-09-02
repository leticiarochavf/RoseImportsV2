import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0008_cadastro_lote_produtos.sql"),
  "utf8",
);
const categoryMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0009_validacao_categorias_importacao.sql",
  ),
  "utf8",
);

describe("migration de cadastro em lote", () => {
  it("modela componentes de kit ligados à variante", () => {
    expect(migration).toContain("create table public.product_variant_kit_items");
    expect(migration).toContain(
      "kit_variant_id     uuid not null references public.product_variants(id) on delete cascade",
    );
    expect(migration).toContain("component_type");
    expect(migration).toContain("component_name");
    expect(migration).toContain("component_quantity");
    expect(migration).toContain("volume_ml");
  });

  it("permite preço ausente apenas em variante inativa", () => {
    expect(migration).toContain("alter column price_cents drop not null");
    expect(migration).toContain("check (price_cents is null or price_cents > 0)");
    expect(migration).toContain("check (not active or price_cents is not null)");
  });

  it("registra chave, hash, autor e resultado da confirmação", () => {
    expect(migration).toContain("create table public.bulk_product_imports");
    expect(migration).toContain("idempotency_key text not null unique");
    expect(migration).toContain("payload_hash");
    expect(migration).toContain("confirmed_by");
    expect(migration).toContain("result          jsonb not null");
  });

  it("mantém idempotência e mutações dentro de uma única função atômica", () => {
    expect(migration).toContain(
      "create or replace function public.confirm_bulk_product_import",
    );
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("stock_quantity = stock_quantity + v_quantity");
    expect(migration).toContain(
      "idempotency_key_reused_with_different_payload",
    );
    expect(migration).not.toMatch(/exception\s+when/i);
  });

  it("impede categoria divergente do tipo de produto", () => {
    expect(categoryMigration).toContain("validate_product_category_type");
    expect(categoryMigration).toContain("product_category_type_mismatch");
    expect(categoryMigration).toContain("v_category_active is distinct from true");
  });
});
