import Image from "next/image";
import Link from "next/link";

const ITEMS = [
  {
    label: "Perfumes",
    href: "/catalogo?categoria=perfumes",
    image: "/categorias/rose-categoria-perfumes.png.png",
    alt: "Perfumes árabes importados",
  },
  {
    label: "Cosméticos",
    href: "/catalogo?categoria=cosmeticos",
    image: "/categorias/rose-categoria-cosmeticos.png.png",
    alt: "Cosméticos e skincare",
  },
  {
    label: "Masculino",
    href: "/catalogo?genero=masculino",
    image: "/categorias/rose-categoria-masculino.png.png",
    alt: "Perfumes masculinos importados",
  },
  {
    label: "Feminino",
    href: "/catalogo?genero=feminino",
    image: "/categorias/rose-categoria-feminino.png.png",
    alt: "Perfumes femininos importados",
  },
] as const;

export function CategoryCircles() {
  return (
    <section
      aria-label="Navegar por categoria"
      className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 lg:px-8"
    >
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4 sm:gap-6">
        {ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group flex min-w-0 flex-col items-center"
          >
            <div
              className="
                relative
                aspect-square
                w-full
                max-w-[240px]
                overflow-hidden
                rounded-full
                border border-line
                bg-surface
                shadow-[0_6px_24px_rgba(0,0,0,0.05)]
                transition-all
                duration-300
                ease-out
                group-hover:-translate-y-1
                group-hover:shadow-[0_14px_35px_rgba(0,0,0,0.10)]
              "
            >
              <Image
                src={item.image}
                alt={item.alt}
                fill
                sizes="(max-width: 640px) 45vw, 24vw"
                className="
                  object-cover object-center
                  transition-transform
                  duration-700
                  ease-out
                  group-hover:scale-[1.045]
                "
              />

              <div
                className="
                  pointer-events-none
                  absolute inset-0
                  rounded-full
                  ring-1
                  ring-inset
                  ring-black/5
                "
              />
            </div>

            <div className="mt-4 text-center">
              <span
                className="
                  text-base
                  font-semibold
                  tracking-[-0.01em]
                  text-ink
                  transition-colors
                  duration-200
                  group-hover:text-rose
                "
              >
                {item.label}
              </span>

              <div
                className="
                  mx-auto
                  mt-2
                  h-[2px]
                  w-0
                  rounded-full
                  bg-rose
                  transition-all
                  duration-300
                  group-hover:w-8
                "
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
