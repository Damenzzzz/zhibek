import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/catalog/ProductCard";

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
    <section className="border-t border-line bg-paper-soft/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="eyebrow">Каталог</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Свежие образы недели
            </h2>
          </div>
          <Link
            href="/catalog"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-accent"
          >
            Весь каталог
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-4 lg:gap-x-6">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              id={item.id}
              category={item.category}
              color={item.color}
              description={item.description}
              imagePath={item.imagePath}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
