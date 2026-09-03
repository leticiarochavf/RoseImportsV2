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
const requiredFieldsMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0012_bulk_import_required_fields.sql",
  ),
  "utf8",
);
const categoryRuleMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0014_categoria_body_splash_como_perfume.sql",
  ),
  "utf8",
);
const saleDataMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0015_cadastro_lote_preco_estoque.sql",
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

  it("reserva cosméticos ao tipo cosmético e aceita body splash em perfumes", () => {
    expect(categoryRuleMigration).toContain(
      "when new.product_type in ('perfume', 'body_splash') then 'perfumes'",
    );
    expect(categoryRuleMigration).toContain(
      "when new.product_type = 'cosmetico' then 'cosmeticos'",
    );
  });

  it("exige os campos comerciais declarados sem criar preço ou imagem", () => {
    expect(requiredFieldsMigration).toContain("invalid_import_name");
    expect(requiredFieldsMigration).toContain("invalid_import_brand");
    expect(requiredFieldsMigration).toContain("invalid_import_category");
    expect(requiredFieldsMigration).toContain("invalid_import_product_type");
    expect(requiredFieldsMigration).toContain("invalid_import_gender");
    expect(requiredFieldsMigration).toContain("v_item->>'gender'");
    expect(requiredFieldsMigration).toContain("price_cents");
    expect(requiredFieldsMigration).toContain("false");
    expect(requiredFieldsMigration).not.toContain("product_images");
  });

  it("permite preparar preço e estoque sem publicar produto sem imagem", () => {
    expect(saleDataMigration).toContain("create_product_with_sale_data");
    expect(saleDataMigration).toContain("price_cents = v_price_cents");
    expect(saleDataMigration).toContain("active = true");
    expect(saleDataMigration).toContain("active = false");
    expect(saleDataMigration).not.toContain("product_images");
  });
});
