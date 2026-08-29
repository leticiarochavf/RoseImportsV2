import type { Metadata } from "next";
import { CheckoutForm } from "@/features/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Finalizar pedido",
  robots: { index: false },
};

export default function FinalizarPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <header>
        <p className="eyebrow">Última etapa</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Finalizar pedido</h1>
        <div className="filete-left mt-3" aria-hidden />
        <p className="mt-4 max-w-md text-sm text-muted">
          Precisamos de poucos dados. O resto — taxa de entrega, horário e
          pagamento — combinamos no WhatsApp.
        </p>
      </header>

      <div className="mt-10">
        <CheckoutForm />
      </div>
    </div>
  );
}
