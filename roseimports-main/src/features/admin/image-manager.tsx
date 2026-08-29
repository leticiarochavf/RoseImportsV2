"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addProductImage, removeProductImage, setProductCover } from "@/features/admin/actions";
import { ConfirmDeleteButton } from "@/features/admin/confirm-delete-button";
import { imageUrl } from "@/lib/images";
import type { ProductImage } from "@/types/database";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function ImageManager({
  productId,
  images,
  productName,
}: {
  productId: string;
  images: ProductImage[];
  productName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [feedback, setFeedback] = useState<
    { ok: boolean; text: string } | null
  >(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setFeedback(null);

    const supabase = createClient();
    let uploaded = 0;

    for (const [index, file] of Array.from(files).entries()) {
      setProgress(`Enviando ${index + 1} de ${files.length}…`);

      if (!ACCEPTED.includes(file.type)) {
        setFeedback({
          ok: false,
          text: `"${file.name}" não é uma imagem aceita. Use JPG, PNG ou WebP.`,
        });
        continue;
      }

      if (file.size > MAX_BYTES) {
        setFeedback({
          ok: false,
          text: `"${file.name}" passa de 5 MB. Reduza a imagem e tente de novo.`,
        });
        continue;
      }

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${productId}/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (error) {
        setFeedback({
          ok: false,
          text: `Não foi possível enviar "${file.name}".`,
        });
        continue;
      }

      const result = await addProductImage(productId, path, productName);

      if (result.ok) uploaded += 1;
      else setFeedback({ ok: false, text: result.error });
    }

    if (uploaded > 0) {
      setFeedback({
        ok: true,
        text: uploaded === 1 ? "Imagem enviada." : `${uploaded} imagens enviadas.`,
      });
    }

    setUploading(false);
    setProgress("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <h2 className="font-display text-lg">Imagens</h2>
      <p className="mt-1.5 text-xs text-muted">
        A primeira imagem é a capa no catálogo. Até 5 MB por arquivo.
      </p>

      <div className="mt-4">
        <label
          htmlFor="upload"
          className="inline-block cursor-pointer border border-line-strong px-6 py-3 text-xs tracking-[0.14em] uppercase transition-colors hover:border-rose hover:text-rose"
        >
          {uploading ? progress || "Enviando…" : "Escolher imagens"}
        </label>
        <input
          ref={inputRef}
          id="upload"
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
      </div>

      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`mt-4 border px-4 py-2.5 text-sm ${
            feedback.ok
              ? "border-success/30 bg-success/5 text-success"
              : "border-danger/30 bg-danger/5 text-danger"
          }`}
        >
          {feedback.text}
        </p>
      )}

      {images.length > 0 ? (
        <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="group relative">
              <div className="relative aspect-square overflow-hidden bg-ivory-deep">
                <Image
                  src={imageUrl(image.storage_path)}
                  alt={image.alt_text ?? productName}
                  fill
                  sizes="150px"
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-ink/80 px-1.5 py-0.5 text-[0.625rem] tracking-[0.1em] text-ivory uppercase">
                    Capa
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap justify-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await setProductCover(productId, image.id);
                      setFeedback(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
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
                    removeProductImage(productId, image.id, image.storage_path)
                  }
                  onResult={(result) => {
                    if (!result.ok) {
                      setFeedback({
                        ok: false,
                        text: result.error ?? "Não foi possível remover.",
                      });
                    }
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 border border-line bg-surface px-5 py-8 text-center text-sm text-muted">
          Nenhuma imagem ainda. Sem foto, o produto aparece com um espaço neutro
          no catálogo.
        </p>
      )}
    </div>
  );
}

