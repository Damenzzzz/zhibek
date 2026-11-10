import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
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
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [item] = await db
    .select()
    .from(catalogItems)
    .where(eq(catalogItems.id, id));
  if (!item) return { title: "Вещь не найдена" };
  const label =
    CATEGORY_LABELS[item.category as CatalogCategory] ?? item.category;
  const name = item.description
    ? item.description.charAt(0).toUpperCase() + item.description.slice(1)
    : label;
  const [cover] = catalogImageUrls(item.images, item.imagePath);
  return {
    title: name,
    description: `${label}${item.color ? `, ${item.color}` : ""}. Примерь на себе в виртуальной примерочной Smart Fashion.`,
    openGraph: cover ? { images: [{ url: cover, alt: name }] } : undefined,
  };
}

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

  const tryonSlot =
    item.category === "bottom"
      ? "bottom"
      : item.category === "shoes"
        ? "shoes"
        : item.category === "bag"
          ? "bag"
          : "top";

  const details = [
    item.color && {
      label: "Цвет",
      value: (
        <span className="flex items-center gap-2.5">
          {swatch && (
            <span
              aria-hidden
              className="size-4 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(42,33,28,0.18)]"
              style={{ backgroundColor: swatch }}
            />
          )}
          <span className="first-letter:uppercase">{item.color}</span>
        </span>
      ),
    },
    item.sku && {
      label: "Артикул",
      value: <span className="tabular-nums">{item.sku}</span>,
    },
    { label: "Категория", value: label },
    { label: "Ракурсов", value: <span className="tabular-nums">{images.length}</span> },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <main className="site-container flex-1 animate-fade-in-up pb-20 pt-28 sm:pt-32">
        <nav
          aria-label="Хлебные крошки"
          className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-soft"
        >
          <Link href="/" className="transition-colors hover:text-clay">
            Главная
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <Link href="/catalog" className="transition-colors hover:text-clay">
            Коллекция
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <Link
            href={`/catalog?category=${item.category}`}
            className="transition-colors hover:text-clay"
          >
            {label}
          </Link>
        </nav>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 xl:gap-24">
          <ProductGallery images={images} alt={item.description ?? label} />

          <div className="flex flex-col lg:sticky lg:top-28 lg:self-start lg:pt-2">
            <span className="label text-clay">{label}</span>
            <h1 className="mt-5 text-balance font-display text-[clamp(2.1rem,4vw,3.4rem)] leading-[1.05] tracking-[-0.015em] text-ink first-letter:uppercase">
              {item.description ?? label}
            </h1>

            <dl className="mt-8 divide-y divide-hair-ink border-y border-hair-ink">
              {details.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[8rem_1fr] items-center gap-4 py-3.5 text-[15px]"
                >
                  <dt className="text-ink-soft">{row.label}</dt>
                  <dd className="text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <AddToFittingRoomButton itemId={item.id} />
              <Link
                href={`/tryon?${tryonSlot}=${item.id}`}
                className="button-secondary button-lg w-full sm:w-auto"
              >
                <Sparkles className="size-4" strokeWidth={1.75} />
                Примерить сразу
              </Link>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">
              Примерка покажет сочетание на твоей модели. Размер и посадку
              сверяй отдельно.
            </p>

            <div className="mt-12 flex flex-col gap-10">
              <ItemStrip title="Часть образа" items={lookItems} />
              <ItemStrip title="Дополните образ" items={matches} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
