/**
 * Ponto único de saída para eventos. (§52)
 *
 * Hoje só registra no console em desenvolvimento. Para plugar GA4, Meta
 * Pixel ou Plausible depois, basta implementar o envio aqui — nenhuma
 * chamada espalhada pelo código precisa mudar.
 */

export type AnalyticsEvent =
  | { name: "product_view"; slug: string }
  | { name: "search"; query: string }
  | { name: "filter_used"; filter: string; value: string }
  | { name: "add_to_cart"; variantId: string; quantity: number }
  | { name: "begin_checkout"; items: number; subtotalCents: number }
  | { name: "preorder_created"; orderNumber: string; subtotalCents: number }
  | { name: "whatsapp_opened"; orderNumber: string };

export function track(event: AnalyticsEvent): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event.name, event);
  }
}
