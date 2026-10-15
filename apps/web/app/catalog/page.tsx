import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems, looks } from "@/lib/schema";
import { isCatalogCategory } from "@/lib/categories";
import { buildCatalogLooks } from "@/lib/catalogView";
import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { PageHeading } from "@/components/PageHeading";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; view?: string; q?: string }>;
}) {
  const params = await searchParams;
  const [items, metadata] = await Promise.all([
    db
      .select()
      .from(catalogItems)
      .orderBy(asc(catalogItems.sortIndex), asc(catalogItems.id)),
    db.select().from(looks),
  ]);
  const outfits = buildCatalogLooks(items, metadata);
  return (
    <main className="flex-1">
      <PageHeading
        label="Коллекция Smart Fashion"
        title="Носи по-своему."
        description="Готовые сочетания для вдохновения. Отдельные вещи — для твоих собственных правил."
      >
        <div className="hidden gap-7 text-ink-soft sm:flex">
          <p>
            <span className="block font-display text-3xl tabular-nums text-ink">
              {items.length}
            </span>
            <span className="mt-1 block text-xs">вещей</span>
          </p>
          <p>
            <span className="block font-display text-3xl tabular-nums text-ink">
              {outfits.length}
            </span>
            <span className="mt-1 block text-xs">образов</span>
          </p>
        </div>
      </PageHeading>
      <CatalogExplorer
        key={[params.category, params.view, params.q].join(":")}
        items={items}
        looks={outfits}
        initialCategory={
          params.category && isCatalogCategory(params.category)
            ? params.category
            : undefined
        }
        initialView={params.view ?? "items"}
        initialQuery={params.q ?? ""}
      />
    </main>
  );
}
