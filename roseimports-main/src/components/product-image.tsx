"use client";

import Image from "next/image";
import { useState } from "react";
import { imageUrl } from "@/lib/images";

/**
 * Imagem do produto sobre fundo levemente quente. Quando não há foto
 * cadastrada, mostra o mesmo enquadramento com a marca — nunca um
 * ícone de imagem quebrada.
 */
export function ProductImage({
  path,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
}: {
  path: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const unavailable = !path || failedPath === path;

  if (unavailable) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ivory-deep">
        <span className="eyebrow" style={{ fontSize: "0.5rem" }}>
          Rose Imports
        </span>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl(path)}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={className}
      onError={() => setFailedPath(path)}
    />
  );
}
