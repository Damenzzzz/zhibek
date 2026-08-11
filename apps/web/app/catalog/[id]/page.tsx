import Link from "next/link";
import { and, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrl, colorSwatch } from "@/lib/catalogDisplay";
import { SkeletonImage } from "@/components/SkeletonImage";
import { AddToFittingRoomButton } from "@/components/catalog/AddToFittingRoomButton";
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

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-6 pt-24 sm:px-6 sm:pb-10 sm:pt-28 lg:px-8">
        <Link href="/catalog" className="text-sm text-ink-soft transition-colors hover:text-ink">
          ← Каталог
        </Link>

        <div className="mt-4 grid gap-8 md:grid-cols-2 md:gap-12">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-line bg-paper-soft">
            <SkeletonImage
              src={catalogImageUrl(item.imagePath)}
              alt={item.description ?? label}
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          <div className="flex flex-col">
            <span className="eyebrow">{label}</span>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {item.description ?? label}
            </h1>

            {item.color && (
              <div className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-ink/15"
                  style={{ backgroundColor: swatch ?? "transparent" }}
                />
                <span className="capitalize">{item.color}</span>
                {item.sku && <span className="text-ink-soft/60">· арт. {item.sku}</span>}
              </div>
            )}

            <div className="mt-8">
              <AddToFittingRoomButton itemId={item.id} />
            </div>

            <div className="mt-10 flex flex-col gap-8 border-t border-line pt-8">
              <ItemStrip title="Часть образа" items={lookItems} />
              <ItemStrip title="Дополните образ" items={matches} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
