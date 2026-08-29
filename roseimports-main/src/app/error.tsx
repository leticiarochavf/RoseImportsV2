"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 text-center">
      <div>
        <p className="eyebrow">Algo saiu do lugar</p>
        <h1 className="mt-3 text-3xl">Não foi possível carregar a página</h1>
        <div className="filete mx-auto mt-4 max-w-40" aria-hidden />
        <p className="mt-4 text-sm text-muted">
          Tente de novo. Se continuar assim, fale com a gente no WhatsApp.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 bg-ink px-8 py-3.5 text-xs tracking-[0.18em] text-ivory uppercase transition-opacity hover:opacity-85"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
