"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/features/cart/cart-context";
import { EmptyState } from "@/components/empty-state";
import { formatCents } from "@/lib/money";
import { computeDiscountCents, normalizeCouponCode } from "@/lib/coupons";
import { delivery } from "@/lib/config/site";
import { track } from "@/lib/analytics";
import type { FulfillmentType, PaymentMethod } from "@/types/database";

type Unavailable = {
  variantId: string;
  productName: string;
  variantLabel: string;
  available: number;
};

type Success = {
  orderNumber: string;
  whatsappUrl: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  couponDiscountPercent: number | null;
};

/** Cupom conferido na prévia. O valor que vale é o que o servidor grava. */
type AppliedCoupon = {
  code: string;
  discountPercent: number;
};

export function CheckoutForm() {
  const { items, ready, subtotalCents, clear, applyAvailability } = useCart();

  const [name, setName] = useState("");
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("retirada");
  const [payment, setPayment] = useState<PaymentMethod>("pix");

  // Endereço de entrega. Só o bairro é gravado; o resto vai na mensagem.
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Cupom: o campo é texto livre; a conferência é do servidor.
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<Unavailable[]>([]);
  const [success, setSuccess] = useState<Success | null>(null);

  useEffect(() => {
    if (ready && items.length > 0) {
      track({ name: "begin_checkout", items: items.length, subtotalCents });
    }
    // Só na primeira vez que o carrinho fica pronto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function onCepChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(masked);
    setCepError(null);
    if (digits.length === 8) void lookupCep(digits);
  }

  // Preenche rua, bairro, cidade e UF a partir do CEP (ViaCEP).
  // Número e complemento continuam manuais.
  async function lookupCep(digits: string) {
    setCepLoading(true);
    setCepError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }
      if (data.logradouro) setStreet(data.logradouro);
      if (data.bairro) setNeighborhood(data.bairro);
      if (data.localidade) setCity(data.localidade);
      if (data.uf) setUf(data.uf);
    } catch {
      setCepError("Não foi possível buscar o CEP. Preencha manualmente.");
    } finally {
      setCepLoading(false);
    }
  }

  /**
   * Prévia do desconto. Não reserva nada: entre esta conferência e o
   * envio do pedido o cupom pode acabar, e é por isso que o servidor
   * confere de novo na hora de gravar.
   */
  async function applyCoupon() {
    const code = normalizeCouponCode(couponInput);

    if (!code) return;

    setCouponChecking(true);
    setCouponError(null);

    try {
      const response = await fetch("/api/cupons/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotalCents }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.valid) {
        setCoupon(null);
        setCouponError(payload.error ?? "Não foi possível conferir o cupom.");
        return;
      }

      setCoupon({
        code: payload.code,
        discountPercent: payload.discountPercent,
      });
      setCouponInput(payload.code);
    } catch {
      setCoupon(null);
      setCouponError("Sem conexão para conferir o cupom.");
    } finally {
      setCouponChecking(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setUnavailable([]);

    try {
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          fulfillmentType: fulfillment,
          neighborhood: fulfillment === "entrega" ? neighborhood : "",
          cep: fulfillment === "entrega" ? cep : "",
          street: fulfillment === "entrega" ? street : "",
          number: fulfillment === "entrega" ? number : "",
          complement: fulfillment === "entrega" ? complement : "",
          city: fulfillment === "entrega" ? city : "",
          state: fulfillment === "entrega" ? uf : "",
          paymentMethod: payment,
          // Só o código. O desconto é calculado pelo servidor a partir
          // da porcentagem guardada no cupom.
          couponCode: coupon?.code ?? "",
          // Preço não vai daqui: o servidor busca o valor atual.
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        // Cupom recusado na confirmação: some da tela para o cliente
        // seguir sem ele em vez de tentar o mesmo código de novo.
        if (payload.couponRejected) {
          setCoupon(null);
          setCouponError(payload.error ?? "Cupom recusado.");
          setError(null);
          return;
        }

        setError(payload.error ?? "Não foi possível gerar o pedido.");

        if (Array.isArray(payload.unavailable)) {
          setUnavailable(payload.unavailable);
          applyAvailability(payload.unavailable);
        }
        return;
      }

      const result = payload as Success;

      track({
        name: "preorder_created",
        orderNumber: result.orderNumber,
        subtotalCents: result.subtotalCents,
      });

      setSuccess(result);
      clear();

      // Tentamos abrir sozinho; se o navegador bloquear, o link fica visível.
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      track({ name: "whatsapp_opened", orderNumber: result.orderNumber });
    } catch {
      setError("Sem conexão com o servidor. Verifique sua internet.");
    } finally {
      setSubmitting(false);
    }
  }

  /*
    Prévia do valor. Segue o carrinho: mudou item, o desconto acompanha,
    porque o percentual é que fica guardado, não o valor.
  */
  const discountCents = coupon
    ? computeDiscountCents(subtotalCents, coupon.discountPercent)
    : 0;

  const totalCents = subtotalCents - discountCents;

  /* -------- Pedido criado -------- */
  if (success) {
    return (
      <div className="mx-auto max-w-lg border border-line bg-surface px-6 py-12 text-center">
        <p className="eyebrow">Pedido gerado</p>
        <p className="mt-3 font-display text-4xl">#{success.orderNumber}</p>
        <div className="filete mx-auto mt-5 max-w-40" aria-hidden />

        {success.couponCode && (
          <p className="mx-auto mt-5 max-w-sm border border-rose-soft bg-rose-wash px-4 py-3 text-sm text-ink-soft">
            Cupom {success.couponCode} aplicado ({success.couponDiscountPercent}
            %): −{formatCents(success.discountCents)}. Total:{" "}
            <span className="text-ink">{formatCents(success.totalCents)}</span>.
          </p>
        )}

        <p className="mx-auto mt-6 max-w-sm text-sm text-muted">
          Abrimos o WhatsApp com o seu pedido. Se a janela não apareceu, use o
          botão abaixo — a mensagem já vai pronta.
        </p>

        <a
          href={success.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-block w-full bg-rose px-8 py-4 text-xs tracking-[0.18em] text-white uppercase transition-colors hover:bg-rose-deep"
        >
          Abrir WhatsApp
        </a>

        <Link
          href="/catalogo"
          className="mt-5 block text-xs tracking-[0.14em] text-muted uppercase hover:text-rose"
        >
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  if (!ready) {
    return <div className="h-96 animate-pulse bg-ivory-deep" role="status" />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nada para finalizar"
        description="Seu carrinho está vazio. Escolha seus produtos no catálogo para montar o pedido."
        actionLabel="Ver catálogo"
        actionHref="/catalogo"
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14"
    >
      <div className="space-y-9">
        {/* -------- Nome -------- */}
        <fieldset>
          <label htmlFor="nome" className="eyebrow">
            Seu nome
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
          />
        </fieldset>

        {/* -------- Recebimento -------- */}
        <fieldset>
          <legend className="eyebrow">Como quer receber</legend>

          <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
            <RadioCard
              name="recebimento"
              value="retirada"
              checked={fulfillment === "retirada"}
              onChange={() => setFulfillment("retirada")}
              title="Retirada"
              description={delivery.pickupNote}
            />
            <RadioCard
              name="recebimento"
              value="entrega"
              checked={fulfillment === "entrega"}
              onChange={() => setFulfillment("entrega")}
              title="Entrega"
              description={`${delivery.region}. Taxa combinada no WhatsApp.`}
            />
          </div>

          {fulfillment === "entrega" && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                <div>
                  <label htmlFor="cep" className="eyebrow">
                    CEP
                  </label>
                  <input
                    id="cep"
                    name="cep"
                    type="text"
                    inputMode="numeric"
                    required
                    value={cep}
                    onChange={(e) => onCepChange(e.target.value)}
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-muted" role="status">
                    {cepLoading
                      ? "Buscando endereço…"
                      : cepError
                        ? cepError
                        : "Preenche o endereço automaticamente."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <div>
                  <label htmlFor="rua" className="eyebrow">
                    Rua
                  </label>
                  <input
                    id="rua"
                    name="rua"
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    autoComplete="address-line1"
                    className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="numero" className="eyebrow">
                    Número
                  </label>
                  <input
                    id="numero"
                    name="numero"
                    type="text"
                    required
                    maxLength={20}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="complemento" className="eyebrow">
                  Complemento{" "}
                  <span className="text-muted lowercase tracking-normal">
                    (opcional)
                  </span>
                </label>
                <input
                  id="complemento"
                  name="complemento"
                  type="text"
                  maxLength={80}
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  autoComplete="address-line2"
                  placeholder="Apto, bloco, ponto de referência…"
                  className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="bairro" className="eyebrow">
                  Bairro
                </label>
                <input
                  id="bairro"
                  name="bairro"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  autoComplete="address-level3"
                  className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
                <div>
                  <label htmlFor="cidade" className="eyebrow">
                    Cidade
                  </label>
                  <input
                    id="cidade"
                    name="cidade"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    autoComplete="address-level2"
                    className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-rose focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="uf" className="eyebrow">
                    UF
                  </label>
                  <input
                    id="uf"
                    name="uf"
                    type="text"
                    required
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    autoComplete="address-level1"
                    className="mt-2.5 w-full border border-line bg-surface px-4 py-3 text-sm uppercase focus:border-rose focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {/* -------- Pagamento -------- */}
        <fieldset>
          <legend className="eyebrow">Forma de pagamento pretendida</legend>

          <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
            <RadioCard
              name="pagamento"
              value="pix"
              checked={payment === "pix"}
              onChange={() => setPayment("pix")}
              title="Pix"
            />
            <RadioCard
              name="pagamento"
              value="dinheiro"
              checked={payment === "dinheiro"}
              onChange={() => setPayment("dinheiro")}
              title="Dinheiro"
            />
            <RadioCard
              name="pagamento"
              value="cartao"
              checked={payment === "cartao"}
              onChange={() => setPayment("cartao")}
              title="Cartão"
            />
          </div>

          {payment === "cartao" && (
            <p className="mt-3 border-l-2 border-rose-soft bg-rose-wash px-4 py-3 text-xs text-ink-soft">
              {delivery.cardNote}
            </p>
          )}
        </fieldset>

        <p className="border-t border-line pt-6 text-xs text-muted">
          Pedimos só o necessário para o atendimento. O endereço é usado apenas
          para combinar a entrega no WhatsApp. Não coletamos CPF nem dados de
          cartão.
        </p>
      </div>

      {/* -------- Resumo e envio -------- */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-line bg-surface p-6">
          <h2 className="eyebrow">Seu pedido</h2>

          <ul className="mt-4 space-y-3 text-sm">
            {items.map((item) => (
              <li key={item.variantId} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate">{item.productName}</span>
                  <span className="text-xs text-muted">
                    {item.variantLabel} · {item.quantity}x
                  </span>
                </span>
                <span className="shrink-0">
                  {formatCents(item.priceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="filete my-5" aria-hidden />

          {/* -------- Cupom -------- */}
          <div>
            <label htmlFor="cupom" className="eyebrow">
              Cupom de desconto
            </label>

            {coupon ? (
              <div className="mt-2.5 flex items-center justify-between gap-3 border border-rose-soft bg-rose-wash px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm tracking-[0.08em]">
                    {coupon.code}
                  </span>
                  <span className="text-xs text-muted">
                    {coupon.discountPercent}% de desconto
                  </span>
                </span>

                <button
                  type="button"
                  onClick={removeCoupon}
                  className="shrink-0 text-xs tracking-[0.12em] text-muted uppercase hover:text-danger"
                >
                  Remover
                </button>
              </div>
            ) : (
              <div className="mt-2.5 flex gap-2">
                <input
                  id="cupom"
                  name="cupom"
                  type="text"
                  maxLength={24}
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(normalizeCouponCode(e.target.value));
                    setCouponError(null);
                  }}
                  onKeyDown={(e) => {
                    // Enter aqui aplica o cupom; não envia o pedido.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void applyCoupon();
                    }
                  }}
                  placeholder="DUDA10"
                  className="min-w-0 flex-1 border border-line bg-surface px-4 py-3 text-sm tracking-[0.08em] uppercase focus:border-rose focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => void applyCoupon()}
                  disabled={couponChecking || couponInput.trim().length === 0}
                  className="shrink-0 border border-line-strong px-4 py-3 text-xs tracking-[0.12em] uppercase transition-colors hover:border-ink disabled:opacity-50"
                >
                  {couponChecking ? "Conferindo…" : "Aplicar"}
                </button>
              </div>
            )}

            {couponError && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {couponError}
              </p>
            )}
          </div>

          <div className="filete my-5" aria-hidden />

          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Subtotal</span>
            <span
              className={
                coupon ? "text-sm text-muted" : "font-display text-2xl"
              }
            >
              {formatCents(subtotalCents)}
            </span>
          </div>

          {coupon && (
            <>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="eyebrow">Desconto</span>
                <span className="text-sm text-rose">
                  −{formatCents(discountCents)}
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="eyebrow">Total</span>
                <span className="font-display text-2xl">
                  {formatCents(totalCents)}
                </span>
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 border border-danger/30 bg-danger/5 px-4 py-3"
            >
              <p className="text-sm text-danger">{error}</p>

              {unavailable.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                  {unavailable.map((item) => (
                    <li key={item.variantId}>
                      {item.productName} ({item.variantLabel}):{" "}
                      {item.available > 0
                        ? `só restam ${item.available}`
                        : "esgotado"}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-2 text-xs text-muted">
                Ajustamos seu carrinho. Confira e tente de novo.
              </p>
              <Link
                href="/carrinho"
                className="mt-2 inline-block text-xs tracking-[0.14em] text-rose uppercase underline-offset-4 hover:underline"
              >
                Revisar carrinho
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full bg-rose px-6 py-4 text-xs tracking-[0.18em] text-white uppercase transition-colors hover:bg-rose-deep disabled:opacity-50"
          >
            {submitting ? "Conferindo disponibilidade…" : "Finalizar no WhatsApp"}
          </button>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            {delivery.note} O pagamento é combinado no atendimento.
          </p>
        </div>
      </aside>
    </form>
  );
}

function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
}) {
  return (
    <label
      className={`block cursor-pointer border px-4 py-3.5 transition-colors ${
        checked
          ? "border-rose bg-rose-wash"
          : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="block text-sm">{title}</span>
      {description && (
        <span className="mt-1 block text-xs leading-relaxed text-muted">
          {description}
        </span>
      )}
    </label>
  );
}
