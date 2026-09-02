"use client";

import { useMemo, useState, useTransition } from "react";

import {
  analyzeBulkProducts,
  confirmBulkProducts,
} from "./actions";
import type { BulkProductImportSummary } from "./import-service";
import {
  buildConfirmItems,
  createEditableItems,
  duplicateEditableItem,
  isItemConfirmable,
  type BulkCategoryIds,
  type BulkProductDecision,
  type EditableBulkProduct,
} from "./ui-model";

const statusLabels = {
  new_product: "Novo produto",
  existing_product: "Produto já existente",
  possible_duplicate: "Possível duplicidade",
  incomplete: "Dados incompletos",
  error: "Erro",
} as const;

const statusClasses = {
  new_product: "border-emerald-200 bg-emerald-50 text-emerald-800",
  existing_product: "border-sky-200 bg-sky-50 text-sky-800",
  possible_duplicate: "border-amber-200 bg-amber-50 text-amber-900",
  incomplete: "border-orange-200 bg-orange-50 text-orange-900",
  error: "border-red-200 bg-red-50 text-red-800",
} as const;

type Feedback = { tone: "success" | "error" | "info"; message: string };

export function BulkProductImport() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<EditableBulkProduct[]>([]);
  const [categoryIds, setCategoryIds] = useState<BulkCategoryIds>({
    perfumes: null,
    cosmeticos: null,
  });
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<BulkProductImportSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const pending = items.filter(
      (item) =>
        item.status === "possible_duplicate" || item.status === "incomplete",
    ).length;
    return {
      newProducts: items.filter((item) => item.status === "new_product").length,
      existing: items.filter((item) => item.status === "existing_product").length,
      pending,
      selected: items.filter((item) => item.selected).length,
      selectedUnits: items
        .filter((item) => item.selected)
        .reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [items]);

  const invalidSelected = items.some(
    (item) => item.selected && !isItemConfirmable(item, categoryIds),
  );

  function analyze() {
    setFeedback(null);
    setResult(null);
    startTransition(async () => {
      const response = await analyzeBulkProducts(input);
      if (!response.ok) {
        setFeedback({ tone: "error", message: response.error });
        return;
      }

      setItems(createEditableItems(response.items));
      setCategoryIds(response.categoryIds);
      setIdempotencyKey(crypto.randomUUID());
      setFeedback({
        tone: "success",
        message: `${response.items.length} produtos analisados. Revise as pendências antes de cadastrar.`,
      });
    });
  }

  function confirm() {
    setFeedback(null);
    let payload;
    try {
      payload = buildConfirmItems(items, categoryIds);
    } catch {
      setFeedback({
        tone: "error",
        message: "Revise todos os itens selecionados antes de confirmar.",
      });
      return;
    }

    if (payload.length === 0) {
      setFeedback({ tone: "error", message: "Selecione ao menos um produto." });
      return;
    }

    startTransition(async () => {
      const response = await confirmBulkProducts({
        idempotencyKey,
        items: payload,
      });
      if (!response.ok) {
        setFeedback({ tone: "error", message: response.error });
        return;
      }

      setResult(response.summary);
      setFeedback({ tone: "success", message: response.message });
    });
  }

  function updateItem(
    clientId: string,
    update: Partial<EditableBulkProduct>,
    refreshKey = true,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.clientId === clientId ? { ...item, ...update } : item,
      ),
    );
    setResult(null);
    if (refreshKey) setIdempotencyKey(crypto.randomUUID());
  }

  function duplicate(item: EditableBulkProduct) {
    const copy = duplicateEditableItem(item, crypto.randomUUID());
    setItems((current) => {
      const index = current.findIndex((candidate) => candidate.clientId === item.clientId);
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
    setResult(null);
    setIdempotencyKey(crypto.randomUUID());
  }

  function selectAllEligible(selected: boolean) {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        selected:
          selected && isItemConfirmable({ ...item, selected: true }, categoryIds),
      })),
    );
    setResult(null);
    setIdempotencyKey(crypto.randomUUID());
  }

  return (
    <div className="space-y-6">
      <section className="border border-line bg-white p-5 sm:p-6">
        <label htmlFor="bulk-products-input" className="text-sm font-medium text-ink">
          Lista de produtos
        </label>
        <p className="mt-1 text-sm text-muted">
          Cole a lista recebida. A análise apenas compara os dados; nada é gravado nesta etapa.
        </p>
        <textarea
          id="bulk-products-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={12}
          className="mt-4 w-full resize-y border border-line bg-ivory px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-ink"
          placeholder="Ex.: Lattafa Jasoor EDP 100 ml — 2 unidades"
        />
        <button
          type="button"
          onClick={analyze}
          disabled={isPending || !input.trim()}
          className="mt-4 inline-flex items-center justify-center bg-ink px-5 py-3 text-xs font-medium tracking-[0.1em] text-ivory uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Analisando..." : "Analisar produtos"}
        </button>
      </section>

      {feedback ? <LocalFeedback feedback={feedback} /> : null}

      {items.length > 0 ? (
        <>
          <section className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line lg:grid-cols-5">
            <Summary label="Analisados" value={items.length} />
            <Summary label="Novos" value={counts.newProducts} />
            <Summary label="Já existentes" value={counts.existing} />
            <Summary label="Pendentes de revisão" value={counts.pending} />
            <Summary label="Unidades selecionadas" value={counts.selectedUnits} />
          </section>

          <section className="border border-line bg-white">
            <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg text-ink">Prévia e decisões</h2>
                <p className="mt-1 text-sm text-muted">
                  Itens pendentes exigem uma decisão e confirmação manual da revisão.
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => selectAllEligible(true)} className="border border-line px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-ink hover:bg-ivory">
                  Selecionar aptos
                </button>
                <button type="button" onClick={() => selectAllEligible(false)} className="border border-line px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-ink hover:bg-ivory">
                  Desselecionar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[82rem] w-full border-collapse text-left text-sm">
                <thead className="bg-ivory text-xs uppercase tracking-[0.08em] text-muted">
                  <tr>
                    <th className="px-3 py-3">Selecionar</th>
                    <th className="px-3 py-3">Produto</th>
                    <th className="px-3 py-3">Marca</th>
                    <th className="px-3 py-3">Tipo</th>
                    <th className="px-3 py-3">Volume</th>
                    <th className="px-3 py-3">Kit</th>
                    <th className="px-3 py-3">Quantidade</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <ProductRow
                      key={item.clientId}
                      item={item}
                      categoryIds={categoryIds}
                      onUpdate={(update) => updateItem(item.clientId, update)}
                      onDuplicate={() => duplicate(item)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-4 border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {counts.selected} itens selecionados · {counts.selectedUnits} unidades
            </p>
            <button
              type="button"
              onClick={confirm}
              disabled={isPending || counts.selected === 0 || invalidSelected || Boolean(result)}
              className="inline-flex items-center justify-center bg-ink px-5 py-3 text-xs font-medium tracking-[0.1em] text-ivory uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Cadastrando..." : "Cadastrar produtos"}
            </button>
          </section>
        </>
      ) : null}

      {result ? (
        <section className="border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950" aria-live="polite">
          <h2 className="font-medium">Cadastro concluído</h2>
          <p className="mt-2">
            {items.length} produtos analisados · {result.productsCreated} novos · {result.existingVariantsUpdated} já existentes · {counts.pending} pendentes de revisão · {result.unitsAdded} unidades adicionadas ao estoque.
          </p>
          <p className="mt-1">{result.variantsCreated} novas variantes ficaram inativas e aguardam definição de preço.</p>
        </section>
      ) : null}
    </div>
  );
}

function ProductRow({
  item,
  categoryIds,
  onUpdate,
  onDuplicate,
}: {
  item: EditableBulkProduct;
  categoryIds: BulkCategoryIds;
  onUpdate: (update: Partial<EditableBulkProduct>) => void;
  onDuplicate: () => void;
}) {
  const eligible = isItemConfirmable({ ...item, selected: true }, categoryIds);
  const needsReview = item.status === "possible_duplicate" || item.status === "incomplete";

  return (
    <tr className="border-t border-line align-top">
      <td className="px-3 py-4">
        <input
          type="checkbox"
          aria-label={`Selecionar ${item.name}`}
          checked={item.selected}
          disabled={!eligible}
          onChange={(event) => onUpdate({ selected: event.target.checked })}
          className="size-4 accent-ink disabled:opacity-40"
        />
      </td>
      <td className="w-64 px-3 py-4">
        <Field value={item.name} ariaLabel="Produto" onChange={(name) => onUpdate({ name })} />
        <Field value={item.variantLabel} ariaLabel="Versão" onChange={(variantLabel) => onUpdate({ variantLabel })} className="mt-2" />
        {item.variations.length > 0 ? (
          <div className="mt-2 text-xs text-orange-900">
            Variações: {item.variations.join(", ")}
            <button type="button" onClick={onDuplicate} className="ml-2 underline underline-offset-2">Duplicar linha</button>
          </div>
        ) : null}
      </td>
      <td className="w-40 px-3 py-4">
        <Field value={item.brand ?? ""} ariaLabel="Marca" placeholder="Não informada" onChange={(brand) => onUpdate({ brand: brand.trim() ? brand : null })} />
      </td>
      <td className="w-40 px-3 py-4">
        <select value={item.productType ?? ""} aria-label="Tipo" onChange={(event) => onUpdate({ productType: event.target.value ? event.target.value as EditableBulkProduct["productType"] : null })} className="w-full border border-line bg-white px-2 py-2 text-sm text-ink">
          <option value="">Revisar</option>
          <option value="perfume">Perfume</option>
          <option value="body_splash">Body splash</option>
          <option value="cosmetico">Cosmético</option>
        </select>
        <select value={item.categorySlug ?? ""} aria-label="Categoria" onChange={(event) => onUpdate({ categorySlug: event.target.value ? event.target.value as EditableBulkProduct["categorySlug"] : null })} className="mt-2 w-full border border-line bg-white px-2 py-2 text-sm text-ink">
          <option value="">Categoria pendente</option>
          <option value="perfumes">Perfumes</option>
          <option value="cosmeticos">Cosméticos</option>
        </select>
        <select value={item.concentration ?? ""} aria-label="Concentração" onChange={(event) => onUpdate({ concentration: event.target.value ? event.target.value as EditableBulkProduct["concentration"] : null })} className="mt-2 w-full border border-line bg-white px-2 py-2 text-sm text-ink">
          <option value="">Sem concentração</option>
          <option value="EDP">EDP</option>
          <option value="EDT">EDT</option>
          <option value="Parfum">Parfum</option>
        </select>
      </td>
      <td className="w-28 px-3 py-4">
        <NumberField value={item.volumeMl} ariaLabel="Volume em ml" onChange={(volumeMl) => onUpdate({ volumeMl })} />
        <span className="mt-1 block text-xs text-muted">ml</span>
      </td>
      <td className="w-24 px-3 py-4">
        <label className="flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" checked={item.isKit} onChange={(event) => onUpdate({ isKit: event.target.checked, components: event.target.checked ? item.components : [] })} className="size-4 accent-ink" />
          Kit
        </label>
        {item.isKit ? <span className="mt-2 block text-xs text-muted">{item.components.length} componentes</span> : null}
      </td>
      <td className="w-28 px-3 py-4">
        <NumberField value={item.quantity} ariaLabel="Quantidade" required onChange={(quantity) => onUpdate({ quantity: quantity ?? 0 })} />
      </td>
      <td className="w-48 px-3 py-4">
        <span className={`inline-flex border px-2 py-1 text-xs font-medium ${statusClasses[item.status]}`}>
          {statusLabels[item.status]}
        </span>
        {item.reasons.length > 0 ? <p className="mt-2 text-xs text-muted">{reasonText(item.reasons)}</p> : null}
      </td>
      <td className="w-80 px-3 py-4">
        <DecisionSelect item={item} onUpdate={onUpdate} />
        {needsReview ? (
          <label className="mt-3 flex items-start gap-2 text-xs text-ink">
            <input type="checkbox" checked={item.reviewed} onChange={(event) => onUpdate({ reviewed: event.target.checked, selected: false })} className="mt-0.5 size-4 accent-ink" />
            Revisei os dados e a decisão manual
          </label>
        ) : null}
        {!eligible && item.decision.type !== "skip" ? <p className="mt-2 text-xs text-orange-900">Complete a revisão para selecionar.</p> : null}
      </td>
    </tr>
  );
}

function DecisionSelect({ item, onUpdate }: { item: EditableBulkProduct; onUpdate: (update: Partial<EditableBulkProduct>) => void }) {
  const options = decisionOptions(item);
  return (
    <select
      aria-label={`Ação para ${item.name}`}
      value={decisionValue(item.decision)}
      onChange={(event) => onUpdate({ decision: parseDecision(event.target.value), selected: false })}
      className="w-full border border-line bg-white px-2 py-2 text-sm text-ink"
    >
      <option value="review">Escolha uma ação</option>
      <option value="skip">Não cadastrar esta linha</option>
      <option value="create_product">Criar novo produto inativo</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function decisionOptions(item: EditableBulkProduct) {
  const options: Array<{ value: string; label: string }> = [];
  const seen = new Set<string>();
  for (const candidate of item.candidates) {
    const productValue = `create_variant:${candidate.productId}`;
    if (!seen.has(productValue)) {
      options.push({ value: productValue, label: `Criar variante inativa em ${candidate.productName}` });
      seen.add(productValue);
    }
    for (const variant of candidate.variants) {
      const value = `increment_variant:${variant.variantId}`;
      if (!seen.has(value)) {
        options.push({ value, label: `Adicionar estoque: ${candidate.productName} — ${variant.label}` });
        seen.add(value);
      }
    }
  }
  if (item.matchedProductId && !seen.has(`create_variant:${item.matchedProductId}`)) {
    options.push({ value: `create_variant:${item.matchedProductId}`, label: "Criar variante no produto encontrado" });
  }
  if (item.matchedVariantId && !seen.has(`increment_variant:${item.matchedVariantId}`)) {
    options.push({ value: `increment_variant:${item.matchedVariantId}`, label: "Adicionar estoque à variante encontrada" });
  }
  return options;
}

function decisionValue(decision: BulkProductDecision) {
  if (decision.type === "create_variant") return `create_variant:${decision.productId}`;
  if (decision.type === "increment_variant") return `increment_variant:${decision.variantId}`;
  return decision.type;
}

function parseDecision(value: string): BulkProductDecision {
  if (value === "skip") return { type: "skip" };
  if (value === "create_product") return { type: "create_product" };
  if (value.startsWith("create_variant:")) return { type: "create_variant", productId: value.slice(15) };
  if (value.startsWith("increment_variant:")) return { type: "increment_variant", variantId: value.slice(18) };
  return { type: "review" };
}

function Field({ value, onChange, ariaLabel, placeholder, className = "" }: { value: string; onChange: (value: string) => void; ariaLabel: string; placeholder?: string; className?: string }) {
  return <input value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel} placeholder={placeholder} className={`${className} w-full border border-line bg-white px-2 py-2 text-sm text-ink`} />;
}

function NumberField({ value, onChange, ariaLabel, required = false }: { value: number | null; onChange: (value: number | null) => void; ariaLabel: string; required?: boolean }) {
  return <input type="number" min={required ? 1 : 0} max={9999} value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} aria-label={ariaLabel} className="w-full border border-line bg-white px-2 py-2 text-sm text-ink" />;
}

function LocalFeedback({ feedback }: { feedback: Feedback }) {
  const classes = feedback.tone === "error" ? "border-red-200 bg-red-50 text-red-900" : feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-line bg-ivory text-ink";
  return <div role={feedback.tone === "error" ? "alert" : "status"} className={`border p-4 text-sm ${classes}`}>{feedback.message}</div>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="bg-white p-4"><p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p><p className="mt-2 text-xl text-ink">{value}</p></div>;
}

function reasonText(reasons: EditableBulkProduct["reasons"]) {
  const labels: Record<string, string> = {
    duplicate_in_batch: "Linha repetida no lote",
    insufficient_product_identity: "Nome específico insuficiente",
    shared_quantity_between_variations: "Quantidade compartilhada entre variações",
    similar_catalog_product: "Produto semelhante no catálogo",
    brand_missing_requires_review: "Marca ausente; possível item do catálogo",
    variant_identity_incomplete: "Versão sem identificação suficiente",
    category_missing: "Categoria não determinada",
  };
  return reasons.map((reason) => labels[reason] ?? reason).join(" · ");
}
