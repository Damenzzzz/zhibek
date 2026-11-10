import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems, looks } from "@/lib/schema";
import { isCatalogCategory } from "@/lib/categories";
import { buildCatalogLooks } from "@/lib/catalogView";
import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";
import { PageHeading } from "@/components/PageHeading";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Коллекция",
  description:
    "Готовые образы и отдельные вещи: верх, низ, верхняя одежда, обувь, сумки и аксессуары. Выбери и примерь на себе.",
};

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
        label="Коллекция"
        title={
          <>
            Носи <span className="headline-accent">по-своему.</span>
          </>
        }
        description="Готовые сочетания для вдохновения. Отдельные вещи — для твоих собственных правил."
      >
        <dl className="hidden divide-x divide-hair-ink text-ink-soft sm:flex">
          {[
            [items.length, "вещей"],
            [outfits.length, "образов"],
          ].map(([value, label]) => (
            <div key={label} className="flex flex-col-reverse px-6 last:pr-0">
              <dt className="mt-2 text-[13px]">{label}</dt>
              <dd className="font-display text-5xl leading-none tabular-nums text-ink">
                {value}
              </dd>
            </div>
          ))}
        </dl>
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
