"use client";

import { useState, useTransition } from "react";
import {
  createProduct,
  updateProduct,
} from "@/features/admin/actions";
import { slugify } from "@/lib/slug";
import type {
  Category,
  OlfactoryFamily,
} from "@/features/catalog/types";
import type {
  Product,
  ProductType,
} from "@/types/database";

export function ProductForm({
  product,
  categories,
  families,
}: {
  product: Product | null;
  categories: Category[];
  families: OlfactoryFamily[];
}) {
  const [name, setName] = useState(
    product?.name ?? "",
  );

  const [slug, setSlug] = useState(
    product?.slug ?? "",
  );

  const [slugTouched, setSlugTouched] =
    useState(Boolean(product));

  const [productType, setProductType] =
    useState<ProductType>(
      product?.product_type ?? "perfume",
    );

  const [pending, startTransition] =
    useTransition();

  const [feedback, setFeedback] =
    useState<{
      ok: boolean;
      text: string;
    } | null>(null);

  /*
   * O endereço acompanha o nome
   * até que seja alterado manualmente.
   */
  function handleName(value: string) {
    setName(value);

    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(
    formData: FormData,
  ) {
    setFeedback(null);

    startTransition(async () => {
      const result = product
        ? await updateProduct(
            product.id,
            formData,
          )
        : await createProduct(
            formData,
          );

      /*
       * createProduct redireciona
       * quando o cadastro dá certo.
       */
      setFeedback(
        result.ok
          ? {
              ok: true,
              text: result.message,
            }
          : {
              ok: false,
              text: result.error,
            },
      );
    });
  }

  const usesOlfactoryFamily =
    productType === "perfume" ||
    productType === "body_splash";

  return (
    <form
      action={handleSubmit}
      className="space-y-8"
    >
      {/* INFORMAÇÕES PRINCIPAIS */}

      <div>
        <div className="mb-5">
          <h3 className="text-sm font-medium text-ink">
            Dados principais
          </h3>

          <p className="mt-1 text-xs text-muted">
            Informações utilizadas para
            identificar o produto no catálogo.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* NOME */}

          <Field
            label="Nome do produto"
            htmlFor="name"
            className="sm:col-span-2"
          >
            <input
              id="name"
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(event) =>
                handleName(
                  event.target.value,
                )
              }
              placeholder="Ex.: Lattafa Yara"
              className={inputClass}
            />
          </Field>

          {/* MARCA */}

          <Field
            label="Marca"
            htmlFor="brand"
            hint="Opcional."
          >
            <input
              id="brand"
              name="brand"
              maxLength={80}
              defaultValue={
                product?.brand ?? ""
              }
              placeholder="Ex.: Lattafa"
              className={inputClass}
            />
          </Field>

          {/* CATEGORIA */}

          <Field
            label="Categoria"
            htmlFor="categoryId"
          >
            <select
              id="categoryId"
              name="categoryId"
              required
              defaultValue={
                product?.category_id ??
                ""
              }
              className={inputClass}
            >
              <option value="">
                Escolha uma categoria
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                ),
              )}
            </select>
          </Field>

          {/* TIPO */}

          <Field
            label="Tipo de produto"
            htmlFor="productType"
          >
            <select
              id="productType"
              name="productType"
              required
              value={productType}
              onChange={(event) =>
                setProductType(
                  event.target
                    .value as ProductType,
                )
              }
              className={inputClass}
            >
              <option value="perfume">
                Perfume
              </option>

              <option value="body_splash">
                Body splash
              </option>

              <option value="cosmetico">
                Cosmético
              </option>
            </select>
          </Field>

          {/* GÊNERO */}

          <Field
            label="Gênero"
            htmlFor="gender"
            hint="Opcional."
          >
            <select
              id="gender"
              name="gender"
              defaultValue={
                product?.gender ?? ""
              }
              className={inputClass}
            >
              <option value="">
                Não se aplica
              </option>

              <option value="feminino">
                Feminino
              </option>

              <option value="masculino">
                Masculino
              </option>

              <option value="unissex">
                Unissex
              </option>
            </select>
          </Field>

          {/* FAMÍLIA OLFATIVA */}

          {usesOlfactoryFamily && (
            <Field
              label="Família olfativa"
              htmlFor="olfactoryFamilyId"
              hint="Opcional. Utilizada nos filtros do catálogo."
              className="sm:col-span-2"
            >
              <select
                id="olfactoryFamilyId"
                name="olfactoryFamilyId"
                defaultValue={
                  product
                    ?.olfactory_family_id ??
                  ""
                }
                className={
                  inputClass
                }
              >
                <option value="">
                  Não se aplica
                </option>

                {families.map(
                  (family) => (
                    <option
                      key={
                        family.id
                      }
                      value={
                        family.id
                      }
                    >
                      {
                        family.name
                      }
                    </option>
                  ),
                )}
              </select>
            </Field>
          )}

          {/*
           * Se for cosmético, enviamos
           * família vazia.
           */}
          {!usesOlfactoryFamily && (
            <input
              type="hidden"
              name="olfactoryFamilyId"
              value=""
            />
          )}

          {/* DESCRIÇÃO */}

          <Field
            label="Descrição"
            htmlFor="description"
            hint="Descreva características importantes do produto."
            className="sm:col-span-2"
          >
            <textarea
              id="description"
              name="description"
              rows={6}
              maxLength={3000}
              defaultValue={
                product?.description ??
                ""
              }
              placeholder="Ex.: fragrância floral, elegante e marcante..."
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      </div>

      {/* URL */}

      <div className="border-t border-line pt-7">
        <div className="mb-5">
          <h3 className="text-sm font-medium text-ink">
            Endereço do produto
          </h3>

          <p className="mt-1 text-xs text-muted">
            Esse endereço é criado
            automaticamente a partir do nome.
          </p>
        </div>

        <Field
          label="URL"
          htmlFor="slug"
          hint="Normalmente não é necessário alterar."
        >
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);

              setSlug(
                event.target.value,
              );
            }}
            className={inputClass}
          />

          <div className="mt-2 rounded-sm bg-ivory-deep/60 px-3 py-2">
            <p className="break-all text-xs text-muted">
              /produto/
              {slug || "nome-do-produto"}
            </p>
          </div>
        </Field>
      </div>

      {/* EXIBIÇÃO */}

      <fieldset className="border-t border-line pt-7">
        <legend className="text-sm font-medium text-ink">
          Exibição no site
        </legend>

        <p className="mt-1 text-xs text-muted">
          Defina como este produto será
          exibido para os clientes.
        </p>

        <div className="mt-5 space-y-3">
          <Check
            name="active"
            label="Produto ativo"
            hint="Quando desativado, o produto deixa de aparecer no catálogo, mas permanece salvo no sistema."
            defaultChecked={
              product?.active ?? true
            }
          />

          <Check
            name="featured"
            label="Em destaque"
            hint="Exibe o produto nas áreas de destaque da loja."
            defaultChecked={
              product?.featured ??
              false
            }
          />

          <Check
            name="promotional"
            label="Em promoção"
            hint="Mostra a identificação de promoção no card do produto."
            defaultChecked={
              product?.promotional ??
              false
            }
          />
        </div>
      </fieldset>

      {/* FEEDBACK */}

      {feedback && (
        <p
          role={
            feedback.ok
              ? "status"
              : "alert"
          }
          className={`
            border px-4 py-3
            text-sm
            ${
              feedback.ok
                ? "border-success/30 bg-success/5 text-success"
                : "border-danger/30 bg-danger/5 text-danger"
            }
          `}
        >
          {feedback.text}
        </p>
      )}

      {/* AÇÃO */}

      <div className="flex flex-col gap-3 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          {product
            ? "Salve para aplicar as alterações."
            : "Depois continuaremos para preço, estoque e imagens."}
        </p>

        <button
          type="submit"
          disabled={pending}
          className="
            inline-flex min-w-[11rem]
            items-center justify-center
            bg-ink
            px-6 py-3.5
            text-xs font-medium
            tracking-[0.12em]
            text-ivory uppercase
            transition-opacity
            hover:opacity-90
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {pending
            ? "Salvando..."
            : product
              ? "Salvar alterações"
              : "Salvar e continuar →"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "mt-2 w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-rose focus:ring-1 focus:ring-rose/10";

/* ---------------------------------------------------------------
   CAMPO
---------------------------------------------------------------- */

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
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium tracking-[0.08em] text-ink uppercase"
      >
        {label}
      </label>

      {children}

      {hint && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   CHECKBOX
---------------------------------------------------------------- */

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
    <label
      className="
        flex cursor-pointer gap-3
        border border-line
        bg-ivory/40
        px-4 py-3
        transition-colors
        hover:bg-ivory-deep/40
      "
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={
          defaultChecked
        }
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#a85f72]"
      />

      <span>
        <span className="block text-sm font-medium text-ink">
          {label}
        </span>

        <span className="mt-0.5 block text-xs leading-relaxed text-muted">
          {hint}
        </span>
      </span>
    </label>
  );
}