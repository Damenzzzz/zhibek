import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { CATEGORY_LABELS, isCatalogCategory, type CatalogCategory } from "@/lib/categories";
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
    <div className="flex flex-1 flex-col bg-canvas">
      {/* Шапка раздела — та же полоса-разворот, что на главной и в примерке:
          песочная плашка, крупная антиква, счётчик выпуска справа. */}
      <header className="relative overflow-hidden border-b border-hair-ink bg-canvas-2 pb-14 pt-32 sm:pb-16 sm:pt-36">
        <div className="warp-lines pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative z-10 mx-auto flex w-full max-w-[88rem] flex-wrap items-end justify-between gap-6 px-5 sm:px-8 lg:px-14">
          <div>
            <span className="tag text-ink-soft">каталог</span>
            <h1 className="mt-5 font-display text-[clamp(2.25rem,6vw,4.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
              Образы
              <br />
              <span className="stroke-clay">недели</span>
            </h1>
          </div>
          <div className="text-right">
            <p className="font-display text-[clamp(2.5rem,7vw,5rem)] leading-none text-clay">
              {String(items.length).padStart(2, "0")}
            </p>
            <p className="mt-1 font-grotesk text-[10px] uppercase tracking-[0.28em] text-ink-soft">
              {activeCategory ? CATEGORY_LABELS[activeCategory as CatalogCategory] : "вещей в выпуске"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[88rem] flex-1 px-5 pb-20 pt-8 sm:px-8 lg:px-14">
        <div className="border-b border-hair-ink">
          <CategoryFilter active={activeCategory} />
        </div>

        {items.length === 0 ? (
          <div className="border border-hair-ink px-5 py-20 text-center">
            {activeCategory ? (
              <p className="font-grotesk text-sm text-ink-soft">
                В категории «{CATEGORY_LABELS[activeCategory as CatalogCategory]}» пока пусто —
                загляни позже.
              </p>
            ) : (
              <>
                <p className="font-grotesk text-sm text-ink-soft">
                  Каталог пока пуст — фото ещё не обработаны.
                </p>
                <p className="mt-2 font-grotesk text-xs text-ink-soft/70">
                  Положи коллажи в <code className="text-ink">data/raw/</code> и запусти{" "}
                  <code className="text-ink">python scripts/process_photos.py</code>.
                </p>
              </>
            )}
          </div>
        ) : (
          // Сбитый по вертикали ритм: каждая вторая карточка опущена — сетка
          // перестаёт читаться ровной витриной маркетплейса.
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
            {items.map((item, i) => (
              <div
                key={item.id}
                className={"stagger-item " + (i % 2 === 1 ? "md:mt-12" : "")}
                // Задержка растёт только для первого экрана карточек — дальше
                // все появляются сразу, чтобы при скролле не было пустот.
                style={{ "--stagger": Math.min(i, 11) } as React.CSSProperties}
              >
                <ProductCard
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
        )}
      </main>
    </div>
  );
}
