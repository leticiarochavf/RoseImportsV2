import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24">
      <EmptyState
        title="Produto não encontrado"
        description="Este produto pode ter saído do catálogo. Veja as outras opções disponíveis."
        actionLabel="Ver catálogo"
        actionHref="/catalogo"
      />
    </div>
  );
}
