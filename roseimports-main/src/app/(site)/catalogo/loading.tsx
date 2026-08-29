export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="h-4 w-28 animate-pulse bg-ivory-deep" />
      <div className="mt-3 h-9 w-52 animate-pulse bg-ivory-deep" />
      <div className="mt-9 h-12 w-full animate-pulse bg-ivory-deep" />

      <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] animate-pulse bg-ivory-deep" />
            <div className="mt-3 h-3 w-2/3 animate-pulse bg-ivory-deep" />
            <div className="mt-2 h-3 w-1/3 animate-pulse bg-ivory-deep" />
          </div>
        ))}
      </div>

      <span className="sr-only" role="status">
        Carregando o catálogo
      </span>
    </div>
  );
}
