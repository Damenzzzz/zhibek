import Link from "next/link";
import { and, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrls, colorSwatch } from "@/lib/catalogDisplay";
import { AddToFittingRoomButton } from "@/components/catalog/AddToFittingRoomButton";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { ItemStrip } from "@/components/catalog/ItemStrip";
import { getMatchingItems } from "@/lib/matching";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [item] = await db.select().from(catalogItems).where(eq(catalogItems.id, id));
  if (!item) {
    notFound();
  }

  const lookItems = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.lookId, item.lookId), ne(catalogItems.id, item.id)));

  // getMatchingItems уже приоритизирует товары того же образа, так что здесь
  // отфильтровываем то, что и так показано в "Часть образа" выше, чтобы блоки
  // не дублировались — "Дополните образ" остаётся только для новых предложений.
  // Лимит увеличен на размер образа: getMatchingItems сам может заполнить
  // весь лимит товарами того же lookId, и без запаса пост-фильтрация здесь
  // вырежет их все, оставив пустой список при образах из 7+ предметов.
  const lookItemIds = new Set(lookItems.map((i) => i.id));
  const matches = (await getMatchingItems(item.id, 6 + lookItems.length)).filter((i) => !lookItemIds.has(i.id));

  const label = CATEGORY_LABELS[item.category as CatalogCategory] ?? item.category;
  const swatch = colorSwatch(item.color);
  const images = catalogImageUrls(item.images, item.imagePath);

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <main className="mx-auto w-full max-w-[88rem] flex-1 animate-fade-in-up px-5 pb-20 pt-28 sm:px-8 lg:px-14">
        <Link
          href="/catalog"
          className="group inline-flex items-center gap-3 font-grotesk text-[10px] uppercase tracking-[0.28em] text-ink-soft transition-colors hover:text-ink"
        >
          <span className="block h-px w-6 bg-clay transition-all duration-300 group-hover:w-10" />
          Каталог
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <ProductGallery images={images} alt={item.description ?? label} />

          <div className="flex flex-col lg:pt-4">
            <span className="tag text-ink-soft">{label}</span>
            <h1 className="mt-5 font-display text-[clamp(1.75rem,4vw,3.25rem)] uppercase leading-[0.95] tracking-[-0.02em] text-ink">
              {item.description ?? label}
            </h1>

            <dl className="mt-8 border-t border-hair-ink font-grotesk">
              {item.color && (
                <div className="grid grid-cols-[7rem_1fr] gap-4 border-b border-hair-ink py-3.5">
                  <dt className="text-[10px] uppercase tracking-[0.24em] text-clay">Цвет</dt>
                  <dd className="flex items-center gap-2 text-[13px] text-ink">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-hair-ink"
                      style={{ backgroundColor: swatch ?? "transparent" }}
                    />
                    <span className="capitalize">{item.color}</span>
                  </dd>
                </div>
              )}
              {item.sku && (
                <div className="grid grid-cols-[7rem_1fr] gap-4 border-b border-hair-ink py-3.5">
                  <dt className="text-[10px] uppercase tracking-[0.24em] text-clay">Артикул</dt>
                  <dd className="text-[13px] tabular-nums text-ink">{item.sku}</dd>
                </div>
              )}
              <div className="grid grid-cols-[7rem_1fr] gap-4 border-b border-hair-ink py-3.5">
                <dt className="text-[10px] uppercase tracking-[0.24em] text-clay">Ракурсов</dt>
                <dd className="text-[13px] tabular-nums text-ink">{images.length}</dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <AddToFittingRoomButton itemId={item.id} />
              <Link
                href={`/tryon?${item.category === "bottom" ? "bottom" : item.category === "shoes" ? "shoes" : item.category === "bag" ? "bag" : "top"}=${item.id}`}
                className="inline-flex items-center border border-hair-ink px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:border-ink"
              >
                Примерить сразу
              </Link>
            </div>

            <div className="mt-12 flex flex-col gap-8">
              <ItemStrip title="Часть образа" items={lookItems} />
              <ItemStrip title="Дополните образ" items={matches} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
