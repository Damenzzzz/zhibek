import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { CATEGORY_LABELS, isCatalogCategory, type CatalogCategory } from "@/lib/categories";
import { SiteHeader } from "@/components/SiteHeader";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { ProductCard } from "@/components/catalog/ProductCard";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category && isCatalogCategory(category) ? category : undefined;

  const items = activeCategory
    ? await db.select().from(catalogItems).where(eq(catalogItems.category, activeCategory))
    : await db.select().from(catalogItems);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent">Каталог</p>
          <div className="mt-2 h-[2px] w-12 bg-gradient-to-r from-gold to-transparent" />
          <h1 className="mt-3 font-display text-4xl italic tracking-tight text-ink sm:text-5xl">
            Образы недели
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Каждая вещь — часть цельного образа. Выбирай отдельные предметы или собирай
            комплект целиком для примерки.
          </p>
        </div>

        <div className="mb-6">
          <CategoryFilter active={activeCategory} />
        </div>

        {items.length === 0 ? (
          <div className="border border-line bg-bone-soft px-5 py-16 text-center">
            {activeCategory ? (
              <p className="text-sm text-ink-soft">
                В категории «{CATEGORY_LABELS[activeCategory as CatalogCategory]}» пока пусто — загляни
                позже.
              </p>
            ) : (
              <>
                <p className="text-sm text-ink-soft">Каталог пока пуст — фото ещё не обработаны.</p>
                <p className="mt-2 text-xs text-ink-soft/70">
                  Положи коллажи в <code className="text-ink">data/raw/</code> и запусти{" "}
                  <code className="text-ink">python scripts/process_photos.py</code>.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
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
        )}
      </main>
    </div>
  );
}
