"use client";

import { useMemo, useState, useTransition } from "react";

import { slugify } from "@/lib/slug";
import { normalizeProductName } from "@/lib/product-name";
import { categorySlugForProductType } from "@/lib/product-category";

import { analyzeBulkProducts, confirmBulkProducts } from "./actions";
import type { BulkProductImportSummary } from "./import-service";
import { buildBulkVariantLabel } from "./parser";
import {
  buildConfirmItems,
  BULK_PRODUCT_FIXED_PRICE_CENTS,
  createEditableItems,
  duplicateEditableItem,
  getItemConfirmationBlockers,
  isItemConfirmable,
  mergeReanalyzedItems,
  type BulkCategoryIds,
  type BulkProductConfirmationBlocker,
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

const inputClass =
  "mt-2 w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-rose focus:ring-1 focus:ring-rose/10";
const missingClass = "border-orange-400 bg-orange-50/40";

const blockerLabels: Record<BulkProductConfirmationBlocker, string> = {
  not_selected: "Selecione este item",
  decision_required: "Escolha o que fazer com esta linha",
  item_skipped: "Esta linha foi marcada para não cadastrar",
  name_missing: "Informe o nome do produto",
  brand_missing: "Informe a marca",
  product_type_missing: "Escolha o tipo de produto",
  category_missing: "Defina a categoria",
  gender_missing: "Escolha o gênero",
  volume_missing: "Informe o volume da versão",
  quantity_invalid: "Informe uma quantidade entre 1 e 9.999",
  manual_review_required: "Confirme que revisou os dados e a decisão",
  category_unavailable: "A categoria escolhida não está disponível",
  price_missing: "O preço fixo deve ser R$ 300,00",
  sale_data_required: "Cadastre o produto com preço e venda habilitada",
  sale_availability_required: "Confirme que a versão ficará disponível para venda",
  product_target_missing: "Escolha o produto que receberá a nova versão",
  variant_target_missing: "Escolha a versão que receberá o estoque",
};

export function BulkProductImport() {
  const [input, setInput] = useState("");
  const [items, setItems] = useState<EditableBulkProduct[]>([]);
  const [categoryIds, setCategoryIds] = useState<BulkCategoryIds>({
    perfumes: null,
    cosmeticos: null,
  });
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [confirmationAvailable, setConfirmationAvailable] = useState(false);
  const [olfactoryFamilies, setOlfactoryFamilies] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<BulkProductImportSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const pending = items.filter(
      (item) =>
        item.status === "possible_duplicate" ||
        item.status === "incomplete" ||
        item.status === "error",
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
  const blockedSelectedCount = items.filter(
    (item) => item.selected && !isItemConfirmable(item, categoryIds),
  ).length;
  const displayedItems = useMemo(() => {
    const visible = showOnlyPending
      ? items.filter(
          (item) =>
            item.status === "incomplete" ||
            item.status === "possible_duplicate" ||
            item.status === "error",
        )
      : items;

    return [...visible].sort((left, right) => {
      const priority = { error: 0, incomplete: 1, possible_duplicate: 2 };
      return (
        (priority[left.status as keyof typeof priority] ?? 3) -
        (priority[right.status as keyof typeof priority] ?? 3)
      );
    });
  }, [items, showOnlyPending]);

  function analyze() {
    setFeedback(null);
    setResult(null);

    startTransition(async () => {
      const response = await analyzeBulkProducts(input);

      if (!response.ok) {
        setFeedback({ tone: "error", message: response.error });
        return;
      }

      setItems((current) =>
        current.length > 0
          ? mergeReanalyzedItems(current, response.items)
          : createEditableItems(response.items),
      );
      setCategoryIds(response.categoryIds);
      setConfirmationAvailable(response.confirmationAvailable);
      setOlfactoryFamilies(response.olfactoryFamilies);
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
      const response = await confirmBulkProducts({ idempotencyKey, items: payload });

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
      const index = current.findIndex(
        (candidate) => candidate.clientId === item.clientId,
      );
      return [
        ...current.slice(0, index + 1),
        copy,
        ...current.slice(index + 1),
      ];
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
    <div className="space-y-7">
      <section className="overflow-hidden border border-line bg-surface">
        <div className="border-b border-line bg-rose-wash/30 px-5 py-4 sm:px-7">
          <p className="eyebrow">Etapa 1 · Lista de origem</p>
          <h2 className="mt-1 text-lg font-medium text-ink">
            Cole os produtos recebidos
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
            A análise organiza os dados e compara com o catálogo. Nenhuma
            informação é gravada até a confirmação final.
          </p>
        </div>

        <div className="p-5 sm:p-7">
          <label
            htmlFor="bulk-products-input"
            className="text-xs font-medium tracking-[0.08em] text-ink uppercase"
          >
            Lista de produtos
          </label>
          <textarea
            id="bulk-products-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={11}
            className={`${inputClass} min-h-56 resize-y leading-relaxed`}
            placeholder="Ex.: 2 LATTAFA JASOOR EDP, 100 ML"
          />

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-relaxed text-muted">
              Nome, marca, categoria, tipo e gênero precisam estar completos.
              Dados ausentes permanecem em revisão e nunca são inventados.
            </p>
            <button
              type="button"
              onClick={analyze}
              disabled={isPending || !input.trim()}
              className="inline-flex min-w-48 items-center justify-center bg-ink px-6 py-3.5 text-xs font-medium tracking-[0.12em] text-ivory uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Analisando..." : "Analisar produtos"}
            </button>
          </div>
        </div>
      </section>

      {feedback ? <LocalFeedback feedback={feedback} /> : null}

      {items.length > 0 && !confirmationAvailable ? (
        <div
          role="status"
          className="border-l-2 border-amber-500 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-950"
        >
          Você pode revisar a análise, mas o cadastro deste lote ainda não está
          disponível neste ambiente. Peça ao responsável técnico para concluir a
          configuração antes de confirmar.
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <section
            aria-label="Resumo da análise"
            className="grid grid-cols-2 gap-3 lg:grid-cols-5"
          >
            <Summary label="Analisados" value={items.length} tone="neutral" />
            <Summary label="Novos" value={counts.newProducts} tone="success" />
            <Summary label="Já existentes" value={counts.existing} tone="info" />
            <Summary label="Em revisão" value={counts.pending} tone="warning" />
            <Summary
              label="Unidades selecionadas"
              value={counts.selectedUnits}
              tone="rose"
              className="col-span-2 lg:col-span-1"
            />
          </section>

          <section className="border border-line bg-surface">
            <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="eyebrow">Etapa 2 · Conferência</p>
                <h2 className="mt-1 text-lg font-medium text-ink">
                  Revise os dados antes do cadastro
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Os cartões seguem os mesmos campos principais do cadastro
                  manual. Itens pendentes exigem uma decisão humana.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowOnlyPending((current) => !current)}
                  className={`border px-3.5 py-2.5 text-xs font-medium tracking-[0.08em] uppercase transition-colors ${
                    showOnlyPending
                      ? "border-rose bg-rose-wash text-rose"
                      : "border-line bg-white text-ink hover:border-ink hover:bg-ivory"
                  }`}
                >
                  {showOnlyPending ? "Mostrar todos" : "Mostrar só o que falta"}
                </button>
                <button
                  type="button"
                  onClick={() => selectAllEligible(true)}
                  className="border border-line bg-white px-3.5 py-2.5 text-xs font-medium tracking-[0.08em] text-ink uppercase transition-colors hover:border-ink hover:bg-ivory"
                >
                  Selecionar aptos
                </button>
                <button
                  type="button"
                  onClick={() => selectAllEligible(false)}
                  className="border border-line bg-white px-3.5 py-2.5 text-xs font-medium tracking-[0.08em] text-ink uppercase transition-colors hover:border-ink hover:bg-ivory"
                >
                  Desselecionar
                </button>
              </div>
            </div>

            <div className="space-y-4 bg-ivory/50 p-4 sm:p-6">
              {displayedItems.map((item) => (
                <ProductCard
                  key={item.clientId}
                  item={item}
                  categoryIds={categoryIds}
                  olfactoryFamilies={olfactoryFamilies}
                  onUpdate={(update) => updateItem(item.clientId, update)}
                  onDuplicate={() => duplicate(item)}
                />
              ))}
            </div>
          </section>

          <section className="sticky bottom-0 z-10 flex flex-col gap-4 border border-line bg-surface/95 p-5 shadow-[0_-8px_24px_rgba(29,22,20,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">
                {counts.selected} itens selecionados · {counts.selectedUnits}{" "}
                unidades
              </p>
              <p className="mt-1 text-xs text-muted">
                {!confirmationAvailable
                  ? "A confirmação depende da configuração técnica deste ambiente."
                  : counts.selected === 0
                    ? "Selecione ao menos um item apto para continuar."
                    : blockedSelectedCount > 0
                      ? `${blockedSelectedCount} ${blockedSelectedCount === 1 ? "item selecionado precisa" : "itens selecionados precisam"} de correção. Veja o motivo no cartão.`
                      : "Tudo pronto. Produtos novos serão cadastrados com venda habilitada."}
              </p>
            </div>
            <button
              type="button"
              onClick={confirm}
              disabled={
                isPending ||
                !confirmationAvailable ||
                counts.selected === 0 ||
                invalidSelected ||
                Boolean(result)
              }
              className="inline-flex min-w-52 items-center justify-center bg-rose px-6 py-3.5 text-xs font-medium tracking-[0.12em] text-white uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
            >
              {isPending ? "Cadastrando..." : "Cadastrar produtos"}
            </button>
          </section>
        </>
      ) : null}

      {result ? (
        <section
          className="border-l-2 border-emerald-600 bg-emerald-50 p-5 text-sm text-emerald-950 sm:p-6"
          aria-live="polite"
        >
          <p className="eyebrow text-emerald-800">Etapa 3 · Concluído</p>
          <h2 className="mt-1 text-lg font-medium">Cadastro concluído</h2>
          <p className="mt-2 leading-relaxed">
            {items.length} produtos analisados · {result.productsCreated} novos
            · {result.existingVariantsUpdated} já existentes · {counts.pending}{" "}
            pendentes de revisão · {result.unitsAdded} unidades adicionadas ao
            estoque.
          </p>
          <p className="mt-1 leading-relaxed">
            {result.variantsCreated} novas variantes ficaram inativas e aguardam
            definição de preço.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function ProductCard({
  item,
  categoryIds,
  olfactoryFamilies,
  onUpdate,
  onDuplicate,
}: {
  item: EditableBulkProduct;
  categoryIds: BulkCategoryIds;
  olfactoryFamilies: Array<{ id: string; name: string }>;
  onUpdate: (update: Partial<EditableBulkProduct>) => void;
  onDuplicate: () => void;
}) {
  const eligible = isItemConfirmable({ ...item, selected: true }, categoryIds);
  const needsReview =
    item.status === "possible_duplicate" ||
    item.status === "incomplete" ||
    item.status === "error";
  const quickFixFields = item.quickFixFields ?? [];
  const [showProductDetails, setShowProductDetails] = useState(
    needsReview &&
      item.decision.type !== "skip" &&
      quickFixFields.length === 0,
  );
  const [showVariantDetails, setShowVariantDetails] = useState(
    !quickFixFields.includes("volume") &&
      !quickFixFields.includes("quantity") &&
      ((!item.isKit && item.volumeMl === null) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 9999),
  );
  const variantLabel = buildBulkVariantLabel({
    volumeMl: item.volumeMl,
    isKit: item.isKit,
    isDecant: item.variantType === "decant",
  });
  const expectedCategory = categorySlugForProductType(item.productType);
  const blockers = getItemConfirmationBlockers(
    { ...item, selected: true },
    categoryIds,
  ).filter((blocker) => blocker !== "not_selected" && blocker !== "item_skipped");
  const actionHelpId = `action-help-${item.clientId}`;

  return (
    <article className="overflow-hidden border border-line bg-surface shadow-[0_2px_12px_rgba(29,22,20,0.035)]">
      <header className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-medium text-ivory">
            {item.sourceLine}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {item.name || "PRODUTO SEM NOME"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Linha {item.sourceLine} da lista · {variantLabel || "versão pendente"} · {item.quantity}{" "}
              {item.quantity === 1 ? "unidade" : "unidades"}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted/80">
              Entrada: “{item.source}”
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses[item.status]}`}
          >
            {statusLabels[item.status]}
          </span>
          <label className="flex items-center gap-2 text-xs font-medium text-ink">
            <input
              type="checkbox"
              aria-label={`Selecionar ${item.name}`}
              checked={item.selected}
              disabled={!eligible}
              aria-describedby={actionHelpId}
              onChange={(event) => onUpdate({ selected: event.target.checked })}
              className="size-4 accent-rose disabled:opacity-40"
            />
            Selecionar
          </label>
        </div>
      </header>

      <div className="space-y-6 p-4 sm:p-5">
        <ReviewActionPanel
          item={item}
          needsReview={needsReview}
          blockers={blockers}
          actionHelpId={actionHelpId}
          onUpdate={onUpdate}
        />

        <details
          open={showProductDetails}
          onToggle={(event) => setShowProductDetails(event.currentTarget.open)}
          className="border-t border-line pt-5"
        >
          <summary className="cursor-pointer text-sm font-medium text-ink marker:text-rose">
            Conferir ou editar dados do produto
            <span className="ml-2 text-xs font-normal text-muted">
              nome, marca, tipo e gênero
            </span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
            {!quickFixFields.includes("name") ? (
            <FormField
              label="Nome do produto"
              htmlFor={`name-${item.clientId}`}
              className="sm:col-span-2 lg:col-span-6"
            >
              <TextField
                id={`name-${item.clientId}`}
                value={item.name}
                invalid={!item.name.trim()}
                maxLength={120}
                placeholder="NOME DO PRODUTO"
                onChange={(name) => {
                  const normalizedName = name.toLocaleUpperCase("pt-BR");
                  onUpdate({
                    name: normalizedName,
                    slug: slugify(normalizedName),
                  });
                }}
                onBlur={() => {
                  const normalizedName = normalizeProductName(item.name);
                  onUpdate({
                    name: normalizedName,
                    slug: slugify(normalizedName),
                  });
                }}
              />
            </FormField>
            ) : null}

            {!quickFixFields.includes("brand") ? (
            <FormField
              label="Marca"
              htmlFor={`brand-${item.clientId}`}
              className="lg:col-span-3"
            >
              <TextField
                id={`brand-${item.clientId}`}
                value={item.brand ?? ""}
                invalid={!item.brand?.trim()}
                maxLength={80}
                placeholder="Marca não informada"
                onChange={(brand) =>
                  onUpdate({ brand: brand.trim() ? brand : null })
                }
              />
            </FormField>
            ) : null}

            {!quickFixFields.includes("category") ? (
            <FormField
              label="Categoria"
              htmlFor={`category-${item.clientId}`}
              className="lg:col-span-3"
            >
              <select
                id={`category-${item.clientId}`}
                value={item.categorySlug ?? ""}
                disabled={!item.productType}
                onChange={(event) =>
                  onUpdate({
                    categorySlug: event.target.value
                      ? (event.target.value as EditableBulkProduct["categorySlug"])
                      : null,
                  })
                }
                className={`${inputClass} ${!item.categorySlug ? missingClass : ""}`}
              >
                <option value="">Escolha uma categoria</option>
                {expectedCategory === "perfumes" ? (
                  <option value="perfumes">Perfumes</option>
                ) : null}
                {expectedCategory === "cosmeticos" ? (
                  <option value="cosmeticos">Cosméticos</option>
                ) : null}
              </select>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Definida automaticamente pelo tipo de produto.
              </p>
            </FormField>
            ) : null}

            {!quickFixFields.includes("product_type") ? (
            <FormField
              label="Tipo de produto"
              htmlFor={`type-${item.clientId}`}
              className="lg:col-span-4"
            >
              <select
                id={`type-${item.clientId}`}
                value={item.productType ?? ""}
                onChange={(event) => {
                  const productType = event.target.value
                    ? (event.target.value as EditableBulkProduct["productType"])
                    : null;

                  onUpdate({
                    productType,
                    categorySlug: categorySlugForProductType(productType),
                  });
                }}
                className={`${inputClass} ${!item.productType ? missingClass : ""}`}
              >
                <option value="">Escolha o tipo</option>
                <option value="perfume">Perfume</option>
                <option value="body_splash">Body splash</option>
                <option value="cosmetico">Cosmético</option>
              </select>
            </FormField>
            ) : null}

            {!quickFixFields.includes("gender") ? (
            <FormField
              label="Gênero"
              htmlFor={`gender-${item.clientId}`}
              className="lg:col-span-4"
            >
              <select
                id={`gender-${item.clientId}`}
                value={item.gender ?? ""}
                onChange={(event) =>
                  onUpdate({
                    gender: event.target.value
                      ? (event.target.value as EditableBulkProduct["gender"])
                      : null,
                  })
                }
                className={`${inputClass} ${!item.gender ? missingClass : ""}`}
              >
                <option value="">Escolha o gênero</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="unissex">Unissex</option>
              </select>
            </FormField>
            ) : null}

            <div className="rounded-sm border border-line bg-ivory-deep/35 px-4 py-3 sm:col-span-2 lg:col-span-4">
              <p className="text-xs font-medium tracking-[0.08em] text-ink uppercase">
                URL automática
              </p>
              <p className="mt-2 break-all text-xs text-muted">
                /produto/{item.slug || "nome-do-produto"}
              </p>
            </div>

            {(item.productType === "perfume" ||
              item.productType === "body_splash") && (
              <FormField
                label="Família olfativa"
                htmlFor={`family-${item.clientId}`}
                hint="Opcional. Se não souber, deixe como não informado."
                className="sm:col-span-2 lg:col-span-6"
              >
                <select
                  id={`family-${item.clientId}`}
                  value={item.olfactoryFamilyId ?? ""}
                  onChange={(event) =>
                    onUpdate({
                      olfactoryFamilyId: event.target.value || null,
                    })
                  }
                  className={inputClass}
                >
                  <option value="">Não informado</option>
                  {olfactoryFamilies.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField
              label="Descrição"
              htmlFor={`description-${item.clientId}`}
              hint="Opcional. Não preencha se a informação não foi fornecida."
              className="sm:col-span-2 lg:col-span-6"
            >
              <textarea
                id={`description-${item.clientId}`}
                rows={3}
                maxLength={3000}
                value={item.description}
                onChange={(event) =>
                  onUpdate({ description: event.target.value })
                }
                className={`${inputClass} resize-y`}
                placeholder="Descrição do produto"
              />
            </FormField>

            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-12">
              <SimpleCheck
                checked={item.featured}
                label="Exibir em destaque"
                hint="Opcional. Pode ser alterado depois."
                onChange={(featured) => onUpdate({ featured })}
              />
              <SimpleCheck
                checked={item.promotional}
                label="Marcar como promoção"
                hint="Não define preço promocional."
                onChange={(promotional) => onUpdate({ promotional })}
              />
            </div>
          </div>
        </details>

        <details
          open={showVariantDetails}
          onToggle={(event) => setShowVariantDetails(event.currentTarget.open)}
          className="border-t border-line pt-5"
        >
          <summary className="cursor-pointer text-sm font-medium text-ink marker:text-rose">
            Conferir volume, quantidade e kit
            <span className="ml-2 text-xs font-normal text-muted">
              {variantLabel || "versão pendente"} · {item.quantity}{" "}
              {item.quantity === 1 ? "unidade" : "unidades"}
            </span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <div className="rounded-sm border border-line bg-ivory-deep/35 px-4 py-3 lg:col-span-4">
              <p className="text-xs font-medium tracking-[0.08em] text-ink uppercase">
                Nome da variante
              </p>
              <p className="mt-2 text-sm font-medium text-ink">
                {variantLabel || "Aguardando volume"}
              </p>
            </div>

            {!quickFixFields.includes("volume") ? (
              <FormField
                label="Volume"
                htmlFor={`volume-${item.clientId}`}
                hint="Em ml."
                className="lg:col-span-2"
              >
                <NumberField
                  id={`volume-${item.clientId}`}
                  value={item.volumeMl}
                  invalid={!item.isKit && item.volumeMl === null}
                  onChange={(volumeMl) =>
                    onUpdate({
                      volumeMl,
                      variantLabel: buildBulkVariantLabel({
                        volumeMl,
                        isKit: item.isKit,
                        isDecant: item.variantType === "decant",
                      }),
                    })
                  }
                />
              </FormField>
            ) : null}

            {!quickFixFields.includes("quantity") ? (
            <FormField
              label="Quantidade em estoque"
              htmlFor={`quantity-${item.clientId}`}
              className="lg:col-span-3"
            >
              <NumberField
                id={`quantity-${item.clientId}`}
                value={item.quantity}
                required
                onChange={(quantity) => onUpdate({ quantity: quantity ?? 0 })}
              />
            </FormField>
            ) : null}

            <div className="flex items-center rounded-sm border border-line bg-ivory/40 px-4 py-3 lg:col-span-3">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={item.isKit}
                  onChange={(event) => {
                    const isKit = event.target.checked;
                    onUpdate({
                      isKit,
                      components: isKit ? item.components : [],
                      variantLabel: buildBulkVariantLabel({
                        volumeMl: item.volumeMl,
                        isKit,
                        isDecant: item.variantType === "decant",
                      }),
                    });
                  }}
                  className="mt-0.5 size-4 accent-rose"
                />
                <span>
                  <span className="block font-medium">Este item é um kit</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {item.isKit
                      ? `${item.components.length} componentes identificados`
                      : "Produto com uma única variante"}
                  </span>
                </span>
              </label>
            </div>

          </div>
        </details>

        {item.variations.length > 0 ? (
          <div className="border-l-2 border-orange-400 bg-orange-50 px-4 py-3 text-sm text-orange-950">
            <p className="font-medium">Variações agrupadas na lista</p>
            <p className="mt-1 text-xs leading-relaxed">
              {item.variations.join(" · ")}
            </p>
            <button
              type="button"
              onClick={onDuplicate}
              className="mt-2 text-xs font-medium underline underline-offset-4"
            >
              Duplicar cartão para separar a quantidade
            </button>
          </div>
        ) : null}

      </div>
    </article>
  );
}

function ReviewActionPanel({
  item,
  needsReview,
  blockers,
  actionHelpId,
  onUpdate,
}: {
  item: EditableBulkProduct;
  needsReview: boolean;
  blockers: BulkProductConfirmationBlocker[];
  actionHelpId: string;
  onUpdate: (update: Partial<EditableBulkProduct>) => void;
}) {
  const skipped = item.decision.type === "skip";

  return (
    <section className="grid gap-4 border border-line bg-ivory/45 p-4 sm:p-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(20rem,1.15fr)]">
      <div>
        <p className="text-xs font-medium tracking-[0.08em] text-ink uppercase">
          Situação encontrada
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses[item.status]}`}
          >
            {statusLabels[item.status]}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {item.reasons.length > 0
            ? reasonText(item.reasons)
            : statusExplanation(item)}
        </p>
        <QuickRequiredFields item={item} onUpdate={onUpdate} />
      </div>

      <div className="border-t border-line pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
        <FormField
          label="O que fazer com este item"
          htmlFor={`decision-${item.clientId}`}
        >
          <DecisionSelect
            id={`decision-${item.clientId}`}
            item={item}
            onUpdate={onUpdate}
          />
        </FormField>
        <p className="mt-2 text-xs leading-relaxed text-ink">
          <span className="font-medium">Resultado:</span> {decisionOutcomeText(item)}
        </p>

        {item.decision.type === "create_product_with_sale_data" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(9rem,0.55fr)_minmax(0,1fr)] sm:items-end">
            <div className="rounded-sm border border-line bg-surface px-3.5 py-2.5">
              <p className="text-xs text-muted">Preço de venda fixo</p>
              <p className="mt-0.5 text-sm font-medium text-ink">R$ 300,00</p>
            </div>
            <div className="rounded-sm border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
              <p className="text-sm font-medium text-emerald-900">
                Disponível para venda: sim
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">
                Obrigatório para todo produto novo. A foto ainda é necessária para aparecer no site.
              </p>
            </div>
          </div>
        ) : null}

        {needsReview && !skipped ? (
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-ink">
            <input
              type="checkbox"
              checked={item.reviewed}
              onChange={(event) =>
                onUpdate({ reviewed: event.target.checked, selected: false })
              }
              className="mt-0.5 size-4 shrink-0 accent-rose"
            />
            Revisei os dados e confirmei esta decisão manualmente.
          </label>
        ) : null}

        <div id={actionHelpId} className="mt-3" aria-live="polite">
          {skipped ? (
            <p className="text-xs font-medium text-muted">
              Esta linha ficará fora da confirmação.
            </p>
          ) : blockers.length > 0 ? (
            <div className="border-l-2 border-orange-500 bg-orange-50 px-3 py-2.5 text-orange-950">
              <p className="text-xs font-medium">Para liberar a seleção:</p>
              <ul className="mt-1 space-y-1 text-xs leading-relaxed">
                {blockers.map((blocker) => (
                  <li key={blocker}>• {blockerLabels[blocker]}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs font-medium text-emerald-800">
              Ação pronta para selecionar e confirmar.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function QuickRequiredFields({
  item,
  onUpdate,
}: {
  item: EditableBulkProduct;
  onUpdate: (update: Partial<EditableBulkProduct>) => void;
}) {
  const quickFixFields = item.quickFixFields ?? [];

  if (item.decision.type === "skip" || quickFixFields.length === 0) {
    return null;
  }

  const expectedCategory = categorySlugForProductType(item.productType);

  return (
    <div className="mt-4 grid gap-3 border-t border-orange-200 pt-4">
      <p className="text-xs font-medium text-orange-950">
        Corrija aqui os campos obrigatórios:
      </p>

      {quickFixFields.includes("name") ? (
        <FormField label="Nome do produto" htmlFor={`name-${item.clientId}`}>
          <TextField
            id={`name-${item.clientId}`}
            value={item.name}
            invalid={!item.name.trim()}
            maxLength={120}
            placeholder="NOME DO PRODUTO"
            onChange={(name) => {
              const normalizedName = name.toLocaleUpperCase("pt-BR");
              onUpdate({ name: normalizedName, slug: slugify(normalizedName) });
            }}
            onBlur={() => {
              const normalizedName = normalizeProductName(item.name);
              onUpdate({ name: normalizedName, slug: slugify(normalizedName) });
            }}
          />
        </FormField>
      ) : null}

      {quickFixFields.includes("brand") ? (
        <FormField label="Marca" htmlFor={`brand-${item.clientId}`}>
          <TextField
            id={`brand-${item.clientId}`}
            value={item.brand ?? ""}
            invalid={!item.brand?.trim()}
            maxLength={80}
            placeholder="Marca não informada"
            onChange={(brand) =>
              onUpdate({ brand: brand.trim() ? brand : null })
            }
          />
        </FormField>
      ) : null}

      {quickFixFields.includes("product_type") ? (
        <FormField label="Tipo de produto" htmlFor={`type-${item.clientId}`}>
          <select
            id={`type-${item.clientId}`}
            value={item.productType ?? ""}
            onChange={(event) => {
              const productType = event.target.value
                ? (event.target.value as EditableBulkProduct["productType"])
                : null;
              onUpdate({
                productType,
                categorySlug: categorySlugForProductType(productType),
              });
            }}
            className={`${inputClass} ${!item.productType ? missingClass : ""}`}
          >
            <option value="">Escolha o tipo</option>
            <option value="perfume">Perfume</option>
            <option value="body_splash">Body splash</option>
            <option value="cosmetico">Cosmético</option>
          </select>
        </FormField>
      ) : null}

      {quickFixFields.includes("category") ? (
        <FormField label="Categoria" htmlFor={`category-${item.clientId}`}>
          <select
            id={`category-${item.clientId}`}
            value={item.categorySlug ?? ""}
            disabled={!item.productType}
            onChange={(event) =>
              onUpdate({
                categorySlug: event.target.value
                  ? (event.target.value as EditableBulkProduct["categorySlug"])
                  : null,
              })
            }
            className={`${inputClass} ${!item.categorySlug ? missingClass : ""}`}
          >
            <option value="">Escolha uma categoria</option>
            {expectedCategory === "perfumes" ? (
              <option value="perfumes">Perfumes</option>
            ) : null}
            {expectedCategory === "cosmeticos" ? (
              <option value="cosmeticos">Cosméticos</option>
            ) : null}
          </select>
        </FormField>
      ) : null}

      {quickFixFields.includes("gender") ? (
        <FormField label="Gênero" htmlFor={`gender-${item.clientId}`}>
          <select
            id={`gender-${item.clientId}`}
            value={item.gender ?? ""}
            onChange={(event) =>
              onUpdate({
                gender: event.target.value
                  ? (event.target.value as EditableBulkProduct["gender"])
                  : null,
              })
            }
            className={`${inputClass} ${!item.gender ? missingClass : ""}`}
          >
            <option value="">Escolha o gênero</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
            <option value="unissex">Unissex</option>
          </select>
        </FormField>
      ) : null}

      {quickFixFields.includes("volume") ? (
        <FormField label="Volume" htmlFor={`volume-${item.clientId}`} hint="Em ml.">
          <NumberField
            id={`volume-${item.clientId}`}
            value={item.volumeMl}
            invalid={!item.isKit && item.volumeMl === null}
            onChange={(volumeMl) =>
              onUpdate({
                volumeMl,
                variantLabel: buildBulkVariantLabel({
                  volumeMl,
                  isKit: item.isKit,
                  isDecant: item.variantType === "decant",
                }),
              })
            }
          />
        </FormField>
      ) : null}

      {quickFixFields.includes("quantity") ? (
        <FormField
          label="Quantidade em estoque"
          htmlFor={`quantity-${item.clientId}`}
        >
          <NumberField
            id={`quantity-${item.clientId}`}
            value={item.quantity}
            required
            onChange={(quantity) => onUpdate({ quantity: quantity ?? 0 })}
          />
        </FormField>
      ) : null}
    </div>
  );
}

function statusExplanation(item: EditableBulkProduct): string {
  if (item.status === "new_product") {
    return "Nenhum produto equivalente foi encontrado no catálogo.";
  }
  if (item.status === "existing_product") {
    return item.matchedVariantId
      ? "O produto e esta versão já existem no catálogo."
      : "O produto já existe, mas esta versão ainda não foi encontrada.";
  }
  if (item.status === "possible_duplicate") {
    return "Há um produto semelhante. Compare antes de decidir.";
  }
  if (item.status === "incomplete") {
    return "Faltam dados para concluir a análise com segurança.";
  }
  return "A análise desta linha precisa de intervenção manual.";
}

function decisionOutcomeText(item: EditableBulkProduct): string {
  if (item.decision.type === "review") {
    return "nenhuma alteração será feita até você escolher uma ação.";
  }
  if (item.decision.type === "skip") {
    return "esta linha não será incluída no cadastro.";
  }
  if (item.decision.type === "create_product") {
    return "um novo produto será criado inativo, com a quantidade informada e sem preço.";
  }
  if (item.decision.type === "create_product_with_sale_data") {
    return "um novo produto será criado por R$ 300,00, com o estoque informado; ele continuará oculto até receber uma foto.";
  }
  if (item.decision.type === "create_variant") {
    const productId = item.decision.productId;
    const target = item.candidates.find(
      (candidate) => candidate.productId === productId,
    );
    return `uma nova versão inativa será criada em ${target?.productName ?? "o produto escolhido"}, sem preço.`;
  }

  const variantId = item.decision.variantId;
  const target = item.candidates
    .flatMap((candidate) =>
      candidate.variants.map((variant) => ({ candidate, variant })),
    )
    .find(({ variant }) => variant.variantId === variantId);
  return `a quantidade será somada ao estoque de ${
    target
      ? `${target.candidate.productName} — ${target.variant.label}`
      : "a versão escolhida"
  }.`;
}

function DecisionSelect({
  id,
  item,
  onUpdate,
}: {
  id: string;
  item: EditableBulkProduct;
  onUpdate: (update: Partial<EditableBulkProduct>) => void;
}) {
  const options = decisionOptions(item);

  return (
    <select
      id={id}
      value={decisionValue(item.decision)}
      onChange={(event) => {
        const decision = parseDecision(event.target.value);
        onUpdate({
          decision,
          selected: false,
          availableForSale:
            decision.type === "create_product_with_sale_data"
              ? true
              : item.availableForSale,
          priceCents:
            decision.type === "create_product_with_sale_data"
              ? BULK_PRODUCT_FIXED_PRICE_CENTS
              : item.priceCents,
        });
      }}
      className={`${inputClass} ${item.decision.type === "review" ? missingClass : ""}`}
    >
      <option value="review">Escolha uma ação</option>
      <option value="skip">Não cadastrar esta linha</option>
      <option value="create_product_with_sale_data">
        Criar novo produto para venda
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function decisionOptions(item: EditableBulkProduct) {
  const options: Array<{ value: string; label: string }> = [];
  const seen = new Set<string>();

  for (const candidate of item.candidates) {
    const productValue = `create_variant:${candidate.productId}`;

    if (!seen.has(productValue)) {
      options.push({
        value: productValue,
        label: `Criar variante inativa em ${candidate.productName}`,
      });
      seen.add(productValue);
    }

    for (const variant of candidate.variants) {
      const value = `increment_variant:${variant.variantId}`;

      if (!seen.has(value)) {
        options.push({
          value,
          label: `Adicionar estoque: ${candidate.productName} — ${variant.label}`,
        });
        seen.add(value);
      }
    }
  }

  if (
    item.matchedProductId &&
    !seen.has(`create_variant:${item.matchedProductId}`)
  ) {
    options.push({
      value: `create_variant:${item.matchedProductId}`,
      label: "Criar variante no produto encontrado",
    });
  }

  if (
    item.matchedVariantId &&
    !seen.has(`increment_variant:${item.matchedVariantId}`)
  ) {
    options.push({
      value: `increment_variant:${item.matchedVariantId}`,
      label: "Adicionar estoque à variante encontrada",
    });
  }

  return options;
}

function decisionValue(decision: BulkProductDecision) {
  if (decision.type === "create_variant") {
    return `create_variant:${decision.productId}`;
  }
  if (decision.type === "increment_variant") {
    return `increment_variant:${decision.variantId}`;
  }
  return decision.type;
}

function parseDecision(value: string): BulkProductDecision {
  if (value === "skip") return { type: "skip" };
  if (value === "create_product") return { type: "create_product" };
  if (value === "create_product_with_sale_data") {
    return { type: "create_product_with_sale_data" };
  }
  if (value.startsWith("create_variant:")) {
    return { type: "create_variant", productId: value.slice(15) };
  }
  if (value.startsWith("increment_variant:")) {
    return { type: "increment_variant", variantId: value.slice(18) };
  }
  return { type: "review" };
}

function TextField({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  maxLength,
  invalid = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
}) {
  return (
    <input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      maxLength={maxLength}
      className={`${inputClass} ${invalid ? missingClass : ""}`}
    />
  );
}

function NumberField({
  id,
  value,
  onChange,
  required = false,
  invalid = false,
}: {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  required?: boolean;
  invalid?: boolean;
}) {
  return (
    <input
      id={id}
      type="number"
      min={required ? 1 : 0}
      max={9999}
      value={value ?? ""}
      onChange={(event) =>
        onChange(event.target.value === "" ? null : Number(event.target.value))
      }
      className={`${inputClass} ${invalid ? missingClass : ""}`}
    />
  );
}

function FormField({
  label,
  htmlFor,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium tracking-[0.08em] text-ink uppercase"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function SimpleCheck({
  checked,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-full cursor-pointer gap-3 rounded-sm border border-line bg-ivory/40 px-4 py-3 transition-colors hover:bg-ivory-deep/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-rose"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">
          {hint}
        </span>
      </span>
    </label>
  );
}

function LocalFeedback({ feedback }: { feedback: Feedback }) {
  const classes =
    feedback.tone === "error"
      ? "border-red-300 bg-red-50 text-red-900"
      : feedback.tone === "success"
        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
        : "border-line bg-ivory text-ink";

  return (
    <div
      role={feedback.tone === "error" ? "alert" : "status"}
      className={`border-l-2 px-5 py-4 text-sm leading-relaxed ${classes}`}
    >
      {feedback.message}
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
  className = "",
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "info" | "warning" | "rose";
  className?: string;
}) {
  const accents = {
    neutral: "border-t-ink",
    success: "border-t-emerald-500",
    info: "border-t-sky-500",
    warning: "border-t-amber-500",
    rose: "border-t-rose",
  } as const;

  return (
    <div
      className={`border border-line border-t-2 bg-surface p-4 sm:p-5 ${accents[tone]} ${className}`}
    >
      <p className="text-[0.68rem] font-medium tracking-[0.08em] text-muted uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-medium text-ink">{value}</p>
    </div>
  );
}

function reasonText(reasons: EditableBulkProduct["reasons"]) {
  const labels: Record<string, string> = {
    duplicate_in_batch: "Linha repetida no lote",
    insufficient_product_identity: "Nome específico insuficiente",
    shared_quantity_between_variations:
      "Quantidade compartilhada entre variações",
    similar_catalog_product: "Produto semelhante no catálogo",
    brand_missing_requires_review: "Marca obrigatória não informada",
    variant_identity_incomplete: "Versão sem identificação suficiente",
    category_missing: "Categoria não determinada",
    product_type_missing: "Tipo de produto não determinado",
    gender_missing: "Gênero não informado",
  };

  return reasons.map((reason) => labels[reason] ?? reason).join(" · ");
}
