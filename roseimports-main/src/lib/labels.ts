import type {
  FulfillmentType,
  Gender,
  OrderStatus,
  PaymentMethod,
} from "@/types/database";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  pago: "Pago",
  entregue: "Entregue",
  retirado: "Retirado",
  cancelado: "Cancelado",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
};

export const FULFILLMENT_LABEL: Record<FulfillmentType, string> = {
  retirada: "Retirada",
  entrega: "Entrega",
};

export const GENDER_LABEL: Record<Gender, string> = {
  feminino: "Feminino",
  masculino: "Masculino",
  unissex: "Unissex",
};

export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  perfume: "Perfume",
  body_splash: "Body splash",
  cosmetico: "Cosmético",
  eletronico: "Eletrônico",
  acessorio: "Acessório",
};

/**
 * Transições permitidas na interface. O banco tem as mesmas travas —
 * isto aqui é só para não oferecer botão que vai dar erro. (§24)
 */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  novo: ["em_atendimento", "pago", "cancelado"],
  em_atendimento: ["pago", "cancelado"],
  pago: ["entregue", "retirado"],
  entregue: [],
  retirado: [],
  cancelado: [],
};
