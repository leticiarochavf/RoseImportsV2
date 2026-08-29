import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 text-center">
      <div>
        <p className="eyebrow">Erro 404</p>
        <h1 className="mt-3 text-3xl">Página não encontrada</h1>
        <div className="filete mx-auto mt-4 max-w-40" aria-hidden />
        <p className="mt-4 text-sm text-muted">
          O endereço que você abriu não existe ou saiu do ar.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block bg-ink px-8 py-3.5 text-xs tracking-[0.18em] text-ivory uppercase transition-opacity hover:opacity-85"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
