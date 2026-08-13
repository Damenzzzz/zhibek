import Link from "next/link";
import { LookCard } from "@/components/home/LookCard";

interface Item {
  id: string;
  category: string;
  color: string | null;
  description: string | null;
  imagePath: string;
}

export function CatalogShowcase({ items }: { items: Item[] }) {
  if (items.length === 0) return null;

  return (
    <section className="grain relative overflow-hidden bg-espresso py-24 text-canvas sm:py-32">
      <div className="relative z-10 mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-14">
        <div className="on-view flex flex-wrap items-end justify-between gap-6 border-b border-hair pb-8">
          <div>
            <span className="tag text-canvas-dim">выпуск недели</span>
            <h2 className="mt-5 font-editorial text-[clamp(2.25rem,6vw,4.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
              Свежие
              <br />
              <span className="stroke-canvas">образы</span>
            </h2>
          </div>
          <Link
            href="/catalog"
            className="group inline-flex items-center gap-4 font-grotesk text-[11px] uppercase tracking-[0.28em] text-canvas"
          >
            весь каталог
            <span className="relative block h-px w-12 bg-hair">
              <span className="absolute inset-y-0 left-0 w-0 bg-clay transition-all duration-500 group-hover:w-full" />
            </span>
          </Link>
        </div>

        {/* Сбитый по вертикали ритм: чётные карточки опущены — сетка перестаёт
            читаться как ровная витрина маркетплейса. */}
        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 lg:gap-x-8">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={"on-view " + (i % 2 === 1 ? "md:mt-16" : "")}
            >
              <LookCard
                id={item.id}
                index={i + 1}
                category={item.category}
                color={item.color}
                description={item.description}
                imagePath={item.imagePath}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
