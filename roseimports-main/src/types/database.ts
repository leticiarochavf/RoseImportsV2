/**
 * Tipos do banco.
 *
 * Escritos à mão para a Fase 1.
 * Depois que o projeto Supabase existir,
 * `npm run db:types` pode regenerar este arquivo
 * a partir do schema real.
 */

export type FulfillmentType =
  | "retirada"
  | "entrega";

export type PaymentMethod =
  | "pix"
  | "dinheiro"
  | "cartao";

export type OrderStatus =
  | "novo"
  | "em_atendimento"
  | "pago"
  | "entregue"
  | "retirado"
  | "cancelado";

/**
 * Tipos de produto disponíveis na Rose Imports.
 *
 * Eletrônicos não fazem mais parte do catálogo.
 */
export type ProductType =
  | "perfume"
  | "body_splash"
  | "cosmetico";

export type Gender =
  | "feminino"
  | "masculino"
  | "unissex";

export type VariantType =
  | "full"
  | "decant";

export type ProductConcentration =
  | "EDP"
  | "EDT"
  | "Parfum";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Category = Timestamps & {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort_order: number;
};

export type OlfactoryFamily = Category;

export type Product = Timestamps & {
  id: string;

  name: string;
  slug: string;
  brand: string | null;

  category_id: string;

  product_type: ProductType;

  gender: Gender | null;

  olfactory_family_id:
    | string
    | null;

  description:
    | string
    | null;

  active: boolean;

  featured: boolean;

  promotional: boolean;

  /** Posição na vitrine, definida por arrastar no painel. */
  showcase_order:
    | number
    | null;
};

export type ProductVariant =
  Timestamps & {
    id: string;

    product_id: string;

    label: string;

    volume_ml:
      | number
      | null;

    variant_type: VariantType;

    price_cents:
      | number
      | null;

    stock_quantity: number;

    active: boolean;

    sort_order: number;

    concentration:
      | ProductConcentration
      | null;

    is_kit: boolean;
  };

export type ProductVariantKitItem = {
  id: string;
  kit_variant_id: string;
  component_type: string;
  component_name: string | null;
  volume_ml: number | null;
  component_quantity: number | null;
  sort_order: number;
  created_at: string;
};

export type BulkProductImport = {
  id: string;
  idempotency_key: string;
  payload_hash: string;
  confirmed_by: string;
  result: Json;
  confirmed_at: string;
};

export type ProductImage = {
  id: string;

  product_id: string;

  storage_path: string;

  alt_text:
    | string
    | null;

  sort_order: number;

  created_at: string;
};

export type Order =
  Timestamps & {
    id: string;

    order_number: string;

    customer_name: string;

    fulfillment_type:
      FulfillmentType;

    neighborhood:
      | string
      | null;

    payment_method:
      PaymentMethod;

    subtotal_cents: number;

    status: OrderStatus;

    paid_at:
      | string
      | null;
  };

export type OrderItem = {
  id: string;

  order_id: string;

  product_id:
    | string
    | null;

  variant_id:
    | string
    | null;

  product_name_snapshot: string;

  variant_label_snapshot: string;

  unit_price_cents_snapshot: number;

  quantity: number;

  subtotal_cents: number;
};

export type Profile = {
  id: string;

  full_name: string;

  created_at: string;
};

type Table<
  Row,
  Insert = Partial<Row>,
  Update = Partial<Row>,
> = {
  Row: Row;

  Insert: Insert;

  Update: Update;

  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;

      categories: Table<Category>;

      olfactory_families:
        Table<OlfactoryFamily>;

      products: Table<Product>;

      product_variants:
        Table<ProductVariant>;

      product_variant_kit_items:
        Table<ProductVariantKitItem>;

      bulk_product_imports:
        Table<BulkProductImport>;

      product_images:
        Table<ProductImage>;

      orders: Table<Order>;

      order_items: Table<
        OrderItem,
        Omit<OrderItem, "id">
      >;
    };

    Views: Record<
      string,
      never
    >;

    Functions: {
      mark_order_paid: {
        Args: {
          p_order_id: string;
        };

        Returns: {
          order_number: string;
          already_paid: boolean;
        }[];
      };

      confirm_bulk_product_import: {
        Args: {
          p_idempotency_key: string;
          p_payload_hash: string;
          p_items: Json;
        };

        Returns: Json;
      };

      is_admin: {
        Args: Record<
          string,
          never
        >;

        Returns: boolean;
      };
    };

    Enums: Record<
      string,
      never
    >;

    CompositeTypes: Record<
      string,
      never
    >;
  };
};
