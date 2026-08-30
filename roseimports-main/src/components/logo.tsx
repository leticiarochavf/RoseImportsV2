import Image from "next/image";
import Link from "next/link";

/**
 * A marca tem três apresentações, porque a logo completa é detalhada
 * demais para funcionar em tamanho pequeno:
 *
 *   mark  — monograma (rosa + frasco + RI). Header, onde há pouca altura.
 *   full  — logo inteira com letreiro. Home e páginas com espaço.
 *   type  — tipografia sobre fundo escuro. Rodapé, onde o PNG de fundo
 *           claro deixaria um retângulo branco.
 */
type Variant = "mark" | "full" | "type";

export function Logo({
  variant = "mark",
  className = "",
  imageClassName = "",
}: {
  variant?: Variant;
  className?: string;
  imageClassName?: string;
}) {
  if (variant === "type") {
    return (
      <Link href="/" className={`inline-flex flex-col ${className}`}>
        <span
          className="font-display text-lg leading-none"
          style={{ letterSpacing: "0.14em" }}
        >
          ROSE IMPORTS
        </span>
        <span className="filete mt-2" aria-hidden />
      </Link>
    );
  }

  const isFull = variant === "full";

  return (
    <Link
      href="/"
      className={`inline-block transition-opacity hover:opacity-80 ${className}`}
      aria-label="Rose Imports — página inicial"
    >
      <Image
        src={isFull ? "/logo.png" : "/logo-mark.png"}
        alt="Rose Imports"
        width={isFull ? 450 : 240}
        height={isFull ? 356 : 150}
        priority
        sizes={isFull ? "(max-width: 640px) 260px, 420px" : "150px"}
        className={`${isFull ? "h-auto w-full" : "h-9 w-auto sm:h-10"} ${imageClassName}`}
      />
    </Link>
  );
}
