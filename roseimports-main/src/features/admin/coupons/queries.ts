import { createClient } from "@/lib/supabase/server";
import { couponAvailability, type CouponAvailability } from "@/lib/coupons";
import type {
  Coupon,
  CouponPerformance,
  Influencer,
  InfluencerPerformance,
  OrderStatus,
} from "@/types/database";

export type CouponListItem = Coupon & {
  influencer: Pick<Influencer, "id" | "name" | "handle"> | null;
  availability: CouponAvailability;
};

const COUPON_COLUMNS = `
  id,
  code,
  discount_percent,
  influencer_id,
  starts_at,
  expires_at,
  max_uses,
  uses_reserved,
  uses_confirmed,
  show_in_showcase,
  active,
  created_at,
  updated_at,
  influencers ( id, name, handle )
`;

type CouponRow = Coupon & {
  influencers: Pick<Influencer, "id" | "name" | "handle"> | null;
};

function toListItem(row: CouponRow, now: Date): CouponListItem {
  const { influencers, ...coupon } = row;

  return {
    ...coupon,
    influencer: influencers,
    availability: couponAvailability(
      {
        active: coupon.active,
        startsAt: coupon.starts_at,
        expiresAt: coupon.expires_at,
        maxUses: coupon.max_uses,
        usesReserved: coupon.uses_reserved,
      },
      now,
    ),
  };
}

export async function listCoupons(): Promise<CouponListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coupons")
    .select(COUPON_COLUMNS)
    // Ativos primeiro; dentro de cada grupo, o mais recente na frente.
    .order("active", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const now = new Date();

  return ((data ?? []) as unknown as CouponRow[]).map((row) =>
    toListItem(row, now),
  );
}

export async function getCoupon(id: string): Promise<CouponListItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coupons")
    .select(COUPON_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return toListItem(data as unknown as CouponRow, new Date());
}

/** Quantos pedidos já usaram o cupom. Decide se a exclusão pode ser física. */
export async function countOrdersUsingCoupon(couponId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", couponId);

  if (error) throw new Error(error.message);

  return count ?? 0;
}

export type InfluencerListItem = Influencer & {
  couponsTotal: number;
  couponsActive: number;
};

export async function listInfluencers(): Promise<InfluencerListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("influencers")
    .select(
      "id, name, handle, notes, active, created_at, updated_at, coupons ( id, active )",
    )
    .order("active", { ascending: false })
    .order("name");

  if (error) throw new Error(error.message);

  type Row = Influencer & { coupons: { id: string; active: boolean }[] };

  return ((data ?? []) as unknown as Row[]).map(({ coupons, ...influencer }) => ({
    ...influencer,
    couponsTotal: coupons.length,
    couponsActive: coupons.filter((coupon) => coupon.active).length,
  }));
}

export async function getInfluencer(id: string): Promise<Influencer | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("influencers")
    .select("id, name, handle, notes, active, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as Influencer | null) ?? null;
}

/* ---------------------------------------------------------------
   Desempenho

   Vem das views da 0013. A conta de faturamento é do banco, para as
   telas não inventarem somas próprias — foi o problema que as contagens
   duplicadas do catálogo já causaram uma vez.
---------------------------------------------------------------- */

export async function listCouponPerformance(): Promise<CouponPerformance[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coupon_performance")
    .select("*")
    // Quem mais faturou primeiro; empate desempata pelo mais recente.
    .order("paid_net_cents", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as CouponPerformance[];
}

export async function getCouponPerformance(
  couponId: string,
): Promise<CouponPerformance | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coupon_performance")
    .select("*")
    .eq("id", couponId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as CouponPerformance | null) ?? null;
}

export async function listInfluencerPerformance(): Promise<
  InfluencerPerformance[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("influencer_performance")
    .select("*")
    .order("paid_net_cents", { ascending: false })
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []) as InfluencerPerformance[];
}

export type CouponOrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  status: OrderStatus;
  paid_at: string | null;
  created_at: string;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  coupon_discount_percent_snapshot: number | null;
};

/** Os pedidos que usaram o cupom, para conferir venda por venda. */
export async function listOrdersByCoupon(
  couponId: string,
): Promise<CouponOrderRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, status, paid_at, created_at, subtotal_cents, discount_cents, total_cents, coupon_discount_percent_snapshot",
    )
    .eq("coupon_id", couponId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  return (data ?? []) as CouponOrderRow[];
}

/** Opções do seletor no formulário de cupom. Arquivados ficam de fora. */
export async function listActiveInfluencerOptions(): Promise<
  Pick<Influencer, "id" | "name" | "handle">[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("influencers")
    .select("id, name, handle")
    .eq("active", true)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []) as Pick<Influencer, "id" | "name" | "handle">[];
}
