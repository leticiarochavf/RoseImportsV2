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

/** jsonb do banco. Usado nos argumentos das funções RPC. */
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

    /* Cupom aplicado. Os três snapshots congelam o desconto no
       momento da compra: desativar, editar ou excluir o cupom
       depois não altera o pedido. coupon_id é só o vínculo que o
       relatório usa, e vira null se o cupom for apagado. */

    coupon_id:
      | string
      | null;

    coupon_code_snapshot:
      | string
      | null;

    coupon_discount_percent_snapshot:
      | number
      | null;

    discount_cents: number;

    /** Coluna gerada pelo banco: subtotal_cents - discount_cents. */
    total_cents: number;
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

export type Influencer =
  Timestamps & {
    id: string;

    name: string;

    /** @perfil da rede social, opcional. */
    handle:
      | string
      | null;

    notes:
      | string
      | null;

    /** false = arquivado. Nunca some do histórico. */
    active: boolean;
  };

export type Coupon =
  Timestamps & {
    id: string;

    /** Sempre normalizado: maiúsculas, sem espaço nas pontas. */
    code: string;

    discount_percent: number;

    influencer_id:
      | string
      | null;

    /** null = vale desde já. */
    starts_at:
      | string
      | null;

    /** null = sem prazo. */
    expires_at:
      | string
      | null;

    /** null = usos ilimitados. */
    max_uses:
      | number
      | null;

    /** Sobe quando o pré-pedido é criado. O limite vale contra ele. */
    uses_reserved: number;

    /** Sobe quando o admin marca o pedido como pago. */
    uses_confirmed: number;

    /** Só exibição pública. Não decide se o cupom é resgatável. */
    show_in_showcase: boolean;

    /** false = desativado (soft-delete). */
    active: boolean;
  };

/**
 * Linha da view coupon_performance.
 *
 * Receita conta pedido pago (paid_at), como no resto do painel. O que
 * ainda está em atendimento aparece como pendente, separado.
 */
export type CouponPerformance = Pick<
  Coupon,
  | "id"
  | "code"
  | "discount_percent"
  | "influencer_id"
  | "active"
  | "show_in_showcase"
  | "starts_at"
  | "expires_at"
  | "max_uses"
  | "uses_reserved"
  | "uses_confirmed"
  | "created_at"
> & {
  paid_orders: number;

  pending_orders: number;

  cancelled_orders: number;

  /** Soma dos subtotais pagos: valor antes do desconto. */
  paid_gross_cents: number;

  /** Quanto de desconto a loja concedeu nos pedidos pagos. */
  paid_discount_cents: number;

  /** Soma dos totais pagos: o que a loja recebeu. */
  paid_net_cents: number;

  /** Pedidos feitos e ainda não pagos, pelo valor final. */
  pending_net_cents: number;
};

export type InfluencerPerformance = Pick<
  Influencer,
  "id" | "name" | "handle" | "active"
> & {
  coupons_total: number;
  coupons_active: number;
  paid_orders: number;
  pending_orders: number;
  paid_gross_cents: number;
  paid_discount_cents: number;
  paid_net_cents: number;
  pending_net_cents: number;
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

      // total_cents é coluna gerada: o banco recusa escrita nela.
      orders: Table<
        Order,
        Partial<Omit<Order, "total_cents">>,
        Partial<Omit<Order, "total_cents">>
      >;

      influencers: Table<Influencer>;

      coupons: Table<Coupon>;

      order_items: Table<
        OrderItem,
        Omit<OrderItem, "id">
      >;
    };

    Views: {
      coupon_performance: {
        Row: CouponPerformance;
        Relationships: [];
      };

      influencer_performance: {
        Row: InfluencerPerformance;
        Relationships: [];
      };
    };

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

      create_preorder: {
        Args: {
          p_customer_name: string;
          p_fulfillment_type: FulfillmentType;
          p_neighborhood: string | null;
          p_payment_method: PaymentMethod;
          p_items: Json;
          p_coupon_code: string | null;
        };

        Returns: {
          order_id: string;
          order_number: string;
          subtotal_cents: number;
          discount_cents: number;
          total_cents: number;
          coupon_code: string | null;
          coupon_discount_percent: number | null;
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
