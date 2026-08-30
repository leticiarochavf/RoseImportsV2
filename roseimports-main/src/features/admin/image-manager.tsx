"use client";

import Image from "next/image";
import {
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addProductImage,
  finalizeProduct,
  removeProductImage,
  setProductCover,
} from "@/features/admin/actions";
import { ConfirmDeleteButton } from "@/features/admin/confirm-delete-button";
import { imageUrl } from "@/lib/images";
import type { ProductImage } from "@/types/database";

const MAX_BYTES =
  5 * 1024 * 1024;

const ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export function ImageManager({
  productId,
  images,
  productName,
  onboarding = false,
}: {
  productId: string;
  images: ProductImage[];
  productName: string;
  onboarding?: boolean;
}) {
  const router = useRouter();

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [uploading, setUploading] =
    useState(false);

  const [finishing, setFinishing] =
    useState(false);

  const [dragging, setDragging] =
    useState(false);

  const [progress, setProgress] =
    useState("");

  const [feedback, setFeedback] =
    useState<{
      ok: boolean;
      text: string;
    } | null>(null);

  /* =============================================================
     UPLOAD
  ============================================================= */

  async function handleFiles(
    files: FileList | null,
  ) {
    if (
      !files ||
      files.length === 0
    ) {
      return;
    }

    setUploading(true);
    setFeedback(null);

    const supabase =
      createClient();

    let uploaded = 0;

    for (const [
      index,
      file,
    ] of Array.from(
      files,
    ).entries()) {
      setProgress(
        `Enviando ${index + 1} de ${files.length}…`,
      );

      if (
        !ACCEPTED.includes(
          file.type,
        )
      ) {
        setFeedback({
          ok: false,

          text: `"${file.name}" não é uma imagem aceita. Use JPG, PNG, WebP ou AVIF.`,
        });

        continue;
      }

      if (
        file.size >
        MAX_BYTES
      ) {
        setFeedback({
          ok: false,

          text: `"${file.name}" passa de 5 MB. Reduza a imagem e tente novamente.`,
        });

        continue;
      }

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ??
        "jpg";

      const path =
        `${productId}/${crypto.randomUUID()}.${extension}`;

      const { error } =
        await supabase.storage
          .from(
            "product-images",
          )
          .upload(
            path,
            file,
            {
              cacheControl:
                "31536000",

              upsert: false,
            },
          );

      if (error) {
        setFeedback({
          ok: false,

          text: `Não foi possível enviar "${file.name}".`,
        });

        continue;
      }

      const result =
        await addProductImage(
          productId,
          path,
          productName,
        );

      if (result.ok) {
        uploaded += 1;
      } else {
        /*
         * Se o registro no banco
         * falhar, removemos o arquivo
         * recém-enviado para não
         * deixar lixo no storage.
         */
        await supabase.storage
          .from(
            "product-images",
          )
          .remove([path]);

        setFeedback({
          ok: false,
          text: result.error,
        });
      }
    }

    if (uploaded > 0) {
      setFeedback({
        ok: true,

        text:
          uploaded === 1
            ? "Imagem enviada automaticamente."
            : `${uploaded} imagens enviadas automaticamente.`,
      });

      /*
       * Atualiza a lista na tela.
       */
      router.refresh();
    }

    setUploading(false);
    setProgress("");

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  }

  /* =============================================================
     FINALIZAR
  ============================================================= */

  async function handleFinish() {
    setFinishing(true);
    setFeedback(null);

    const result =
      await finalizeProduct(
        productId,
      );

    if (!result.ok) {
      setFeedback({
        ok: false,
        text: result.error,
      });

      setFinishing(false);
      return;
    }

    router.push(
      `/admin/produtos/${productId}?finalizado=1`,
    );

    router.refresh();
  }

  return (
    <div>
      {/* CABEÇALHO */}

      <div>
        <h2 className="text-lg font-medium text-ink">
          Imagens
        </h2>

        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-muted">
          Adicione as fotos do
          produto. A primeira
          imagem será utilizada
          como capa do catálogo.
        </p>
      </div>

      {/* ÁREA DE UPLOAD */}

      <div
        className={`
          mt-6
          border border-dashed
          px-5 py-10
          text-center
          transition-colors
          ${
            dragging
              ? "border-rose bg-rose-wash/40"
              : "border-line-strong bg-ivory/30"
          }
        `}
        onDragEnter={(
          event,
        ) => {
          event.preventDefault();

          setDragging(true);
        }}
        onDragOver={(
          event,
        ) => {
          event.preventDefault();

          setDragging(true);
        }}
        onDragLeave={(
          event,
        ) => {
          event.preventDefault();

          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();

          setDragging(false);

          void handleFiles(
            event.dataTransfer
              .files,
          );
        }}
      >
        <div className="mx-auto max-w-sm">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-xl text-muted">
            +
          </div>

          <p className="mt-4 text-sm font-medium text-ink">
            Adicionar fotos
          </p>

          <p className="mt-1 text-xs leading-relaxed text-muted">
            Arraste as imagens
            aqui ou clique para
            selecionar.
          </p>

          <p className="mt-1 text-[0.68rem] text-muted">
            JPG, PNG, WebP ou
            AVIF · máximo 5 MB
          </p>

          <label
            htmlFor="upload"
            className="
              mt-5 inline-flex
              cursor-pointer
              items-center
              justify-center
              bg-ink
              px-5 py-3
              text-xs font-medium
              tracking-[0.1em]
              text-ivory uppercase
              transition-opacity
              hover:opacity-90
            "
          >
            {uploading
              ? progress ||
                "Enviando…"
              : "Escolher imagens"}
          </label>

          <input
            ref={inputRef}
            id="upload"
            type="file"
            accept={ACCEPTED.join(
              ",",
            )}
            multiple
            disabled={uploading}
            onChange={(event) =>
              void handleFiles(
                event.target.files,
              )
            }
            className="sr-only"
          />
        </div>
      </div>

      {/* FEEDBACK */}

      {feedback && (
        <p
          role={
            feedback.ok
              ? "status"
              : "alert"
          }
          className={`
            mt-5 border
            px-4 py-3
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

      {/* IMAGENS */}

      {images.length > 0 ? (
        <div className="mt-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">
              Fotos adicionadas
            </p>

            <span className="text-xs text-muted">
              {images.length}{" "}
              {images.length === 1
                ? "imagem"
                : "imagens"}
            </span>
          </div>

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map(
              (
                image,
                index,
              ) => (
                <li
                  key={
                    image.id
                  }
                  className="group"
                >
                  <div className="relative aspect-square overflow-hidden rounded-md border border-line bg-ivory-deep">
                    <Image
                      src={imageUrl(
                        image.storage_path,
                      )}
                      alt={
                        image.alt_text ??
                        productName
                      }
                      fill
                      sizes="180px"
                      className="object-cover"
                    />

                    {index ===
                      0 && (
                      <span className="absolute left-2 top-2 bg-ink/85 px-2 py-1 text-[0.625rem] font-medium tracking-[0.08em] text-ivory uppercase">
                        Capa
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex min-h-7 flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          setFeedback(
                            null,
                          );

                          const result =
                            await setProductCover(
                              productId,
                              image.id,
                            );

                          setFeedback(
                            result.ok
                              ? {
                                  ok: true,
                                  text:
                                    result.message,
                                }
                              : {
                                  ok: false,
                                  text:
                                    result.error,
                                },
                          );

                          if (
                            result.ok
                          ) {
                            router.refresh();
                          }
                        }}
                        className="text-xs text-muted underline-offset-4 hover:text-rose hover:underline"
                      >
                        Tornar capa
                      </button>
                    )}

                    <ConfirmDeleteButton
                      idleLabel="Remover"
                      confirmLabel="Confirmar"
                      onConfirm={() =>
                        removeProductImage(
                          productId,
                          image.id,
                          image.storage_path,
                        )
                      }
                      onResult={(
                        result,
                      ) => {
                        if (
                          !result.ok
                        ) {
                          setFeedback({
                            ok: false,

                            text:
                              result.error ??
                              "Não foi possível remover.",
                          });

                          return;
                        }

                        setFeedback({
                          ok: true,

                          text:
                            result.message ??
                            "Imagem removida.",
                        });

                        router.refresh();
                      }}
                    />
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      ) : (
        <div className="mt-6 border border-line bg-surface px-5 py-7 text-center">
          <p className="text-sm font-medium text-ink">
            Nenhuma foto
            adicionada
          </p>

          <p className="mt-1 text-xs text-muted">
            Adicione pelo menos
            uma imagem para
            finalizar o produto.
          </p>
        </div>
      )}

      {/* FINALIZAÇÃO */}

      {onboarding && (
        <div className="mt-8 flex flex-col gap-5 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink">
              Última etapa
            </p>

            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">
              Quando finalizar, o
              produto será ativado
              e poderá aparecer no
              catálogo da loja.
            </p>
          </div>

          <button
            type="button"
            disabled={
              finishing ||
              uploading ||
              images.length === 0
            }
            onClick={() =>
              void handleFinish()
            }
            className="
              inline-flex
              min-w-[12rem]
              items-center
              justify-center
              bg-ink
              px-6 py-3.5
              text-xs font-medium
              tracking-[0.1em]
              text-ivory uppercase
              transition-opacity
              hover:opacity-90
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {finishing
              ? "Finalizando…"
              : "Finalizar produto"}
          </button>
        </div>
      )}
    </div>
  );
}