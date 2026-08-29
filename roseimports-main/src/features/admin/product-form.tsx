"use client";

import { useState, useTransition } from "react";
import { createProduct, updateProduct } from "@/features/admin/actions";
import { slugify } from "@/lib/slug";
import type { Category, OlfactoryFamily } from "@/features/catalog/types";
import type { Product } from "@/types/database";

export function ProductForm({
  product,
  categories,
  families,
}: {
  product: Product | null;
  categories: Category[];
  families: OlfactoryFamily[];
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { ok: boolean; text: string } | null
  >(null);

  // O endereço acompanha o nome até alguém editá-lo à mão.
  function handleName(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSubmit(formData: FormData) {
    setFeedback(null);

    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, formData)
        : await createProduct(formData);

      // createProduct redireciona quando dá certo; só chegamos aqui em erro.
      setFeedback(
        result.ok
          ? { ok: true, text: result.message }
          : { ok: false, text: result.error },
      );
    });
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Nome" htmlFor="name" className="sm:col-span-2">
          <input
            id="name"
            name="name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => handleName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Endereço no site"
          htmlFor="slug"
          hint="Aparece na URL do produto."
          className="sm:col-span-2"
        >
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-muted">/produto/{slug || "…"}</p>
        </Field>

        <Field label="Marca" htmlFor="brand">
          <input
            id="brand"
            name="brand"
            maxLength={80}
            defaultValue={product?.brand ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Categoria" htmlFor="categoryId">
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={product?.category_id ?? ""}
            className={inputClass}
          >
            <option value="">Escolha…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipo" htmlFor="productType">
          <select
            id="productType"
            name="productType"
            required
            defaultValue={product?.product_type ?? "perfume"}
            className={inputClass}
          >
            <option value="perfume">Perfume</option>
            <option value="body_splash">Body splash</option>
            <option value="cosmetico">Cosmético</option>
            <option value="eletronico">Eletrônico</option>
            <option value="acessorio">Acessório</option>
          </select>
        </Field>

        <Field label="Gênero" htmlFor="gender" hint="Opcional.">
          <select
            id="gender"
            name="gender"
            defaultValue={product?.gender ?? ""}
            className={inputClass}
          >
            <option value="">Não se aplica</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
            <option value="unissex">Unissex</option>
          </select>
        </Field>

        <Field
          label="Família olfativa"
          htmlFor="olfactoryFamilyId"
          hint="Opcional. Usada no filtro do catálogo."
          className="sm:col-span-2"
        >
          <select
            id="olfactoryFamilyId"
            name="olfactoryFamilyId"
            defaultValue={product?.olfactory_family_id ?? ""}
            className={inputClass}
          >
            <option value="">Não se aplica</option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Descrição" htmlFor="description" className="sm:col-span-2">
          <textarea
            id="description"
            name="description"
            rows={5}
            maxLength={3000}
            defaultValue={product?.description ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <fieldset className="border-t border-line pt-6">
        <legend className="eyebrow">Exibição no site</legend>
        <div className="mt-4 space-y-3">
          <Check
            name="active"
            label="Ativo"
            hint="Desmarcado, o produto sai do catálogo mas continua nos pedidos antigos."
            defaultChecked={product?.active ?? true}
          />
          <Check
            name="featured"
            label="Em destaque"
            hint="Aparece na página inicial."
            defaultChecked={product?.featured ?? false}
          />
          <Check
            name="promotional"
            label="Em promoção"
            hint="Mostra a etiqueta de promoção no card."
            defaultChecked={product?.promotional ?? false}
          />
        </div>
      </fieldset>

      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`border px-4 py-3 text-sm ${
            feedback.ok
              ? "border-success/30 bg-success/5 text-success"
              : "border-danger/30 bg-danger/5 text-danger"
          }`}
        >
          {feedback.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-ink px-8 py-3.5 text-xs tracking-[0.18em] text-ivory uppercase transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Salvando…" : product ? "Salvar produto" : "Criar produto"}
      </button>
    </form>
  );
}

const inputClass =
  "mt-2 w-full border border-line bg-ivory px-3.5 py-2.5 text-sm focus:border-rose focus:outline-none";

function Field({
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
      <label htmlFor={htmlFor} className="eyebrow">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Check({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 accent-[#a85f72]"
      />
      <span>
        <span className="block text-sm">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}
