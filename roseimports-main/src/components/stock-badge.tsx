import type { StockStatus } from "@/lib/stock";
import { STOCK_LABEL } from "@/lib/stock";

const STYLES: Record<StockStatus, string> = {
  disponivel: "text-success",
  ultimas: "text-rose",
  esgotado: "text-muted",
};

/** Mostra só o rótulo. A quantidade real nunca chega ao cliente. (§13) */
export function StockBadge({
  status,
  className = "",
}: {
  status: StockStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${STYLES[status]} ${className}`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: "currentColor" }}
      />
      {STOCK_LABEL[status]}
    </span>
  );
}
