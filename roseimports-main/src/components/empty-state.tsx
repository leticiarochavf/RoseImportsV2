import Link from "next/link";

/** Tela vazia é convite para agir, não aviso de erro. */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="border border-line bg-surface px-6 py-14 text-center">
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 inline-block border border-ink px-6 py-2.5 text-xs tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-ivory"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
