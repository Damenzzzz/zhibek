import { Suspense } from "react";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems, looks } from "@/lib/schema";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { PageHeading } from "@/components/PageHeading";
import { TryonForm } from "@/components/tryon/TryonForm";

export default async function TryonPage() {
  const [items, lookRows] = await Promise.all([
    db
      .select()
      .from(catalogItems)
      .where(
        inArray(catalogItems.category, [
          "top",
          "outerwear",
          "bottom",
          "shoes",
          "bag",
        ]),
      )
      .orderBy(asc(catalogItems.sortIndex), asc(catalogItems.id)),
    db.select().from(looks),
  ]);

  // Обложки/порядок образов из админки (см. lib/schema.ts looks). У pipeline-
  // образов строки нет — обложка берётся файлом /catalog/looks/<id>.jpg.
  const lookCovers = new Map<string, string>();
  const lookSort = new Map<string, number>();
  for (const l of lookRows) {
    if (l.coverPath) lookCovers.set(l.id, catalogImageUrl(l.coverPath));
    lookSort.set(l.id, l.sortIndex);
  }

  const tops = items.filter(
    (item) => item.category === "top" || item.category === "outerwear",
  );
  const bottoms = items.filter((item) => item.category === "bottom");
  const shoes = items.filter((item) => item.category === "shoes");
  const bags = items.filter((item) => item.category === "bag");

  // Полные образы: группируем все вещи по look_id и берём по одной на слот.
  // Верхняя одежда (жилет/жакет) — отдельный слот, надевается поверх верха.
  // Обложка образа — фото модели в полном комплекте (data/catalog/looks/<id>.jpg,
  // синкается в public/catalog/looks), с откатом на фото одной вещи.
  const looksById = new Map<string, typeof items>();
  for (const item of items) {
    const arr = looksById.get(item.lookId) ?? [];
    arr.push(item);
    looksById.set(item.lookId, arr);
  }
  const builtLooks = Array.from(looksById.entries())
    .map(([lookId, lookItems]) => {
      const first = (cat: string) => lookItems.find((i) => i.category === cat);
      const outerwear = first("outerwear");
      const top = first("top");
      const bottom = first("bottom");
      const shoesItem = first("shoes");
      const bag = first("bag");
      const slots = [outerwear, top, bottom, shoesItem, bag].filter(
        (i): i is (typeof items)[number] => Boolean(i),
      );
      const rep = outerwear ?? top ?? slots[0];
      return {
        lookId,
        // Обложка админского образа (из таблицы looks) или файл пайплайна.
        cover: lookCovers.get(lookId) ?? `/catalog/looks/${lookId}.jpg`,
        fallbackImage: rep ? catalogImageUrl(rep.imagePath) : "",
        outerwearId: outerwear?.id,
        topId: top?.id,
        bottomId: bottom?.id,
        shoesId: shoesItem?.id,
        bagId: bag?.id,
        itemCount: slots.length,
        // Вещи образа по слотам — чтобы на /tryon показать состав образа и дать
        // перейти к каждой вещи по отдельности (на её карточку в каталоге).
        items: slots.map((i) => ({
          id: i.id,
          category: i.category,
          color: i.color,
          description: i.description,
          imagePath: i.imagePath,
        })),
      };
    })
    // Образ = минимум 2 вещи (иначе это не «комплект»).
    .filter((l) => l.itemCount >= 2)
    .sort((a, b) => {
      // Сначала ручной порядок образа из админки (looks.sort_index), затем
      // числовой look_id (как раньше), с откатом на строковое сравнение.
      const sa = lookSort.get(a.lookId) ?? 0;
      const sb = lookSort.get(b.lookId) ?? 0;
      if (sa !== sb) return sa - sb;
      const na = Number(a.lookId);
      const nb = Number(b.lookId);
      return Number.isNaN(na) || Number.isNaN(nb)
        ? a.lookId.localeCompare(b.lookId)
        : na - nb;
    });

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <PageHeading
        label="Виртуальная примерочная"
        title="Посмотрим на тебе?"
        description="Готовый комплект или твоё собственное сочетание. Выбирай детали и создавай образ целиком за одну примерку."
      />

      <main className="mx-auto w-full max-w-[88rem] flex-1 px-5 pb-20 pt-10 sm:px-8 lg:px-14">
        <Suspense
          fallback={
            <div
              className="h-64 bg-canvas-2"
              aria-label="Загрузка примерочной"
            />
          }
        >
          <TryonForm
            tops={tops}
            bottoms={bottoms}
            shoes={shoes}
            bags={bags}
            looks={builtLooks}
          />
        </Suspense>
      </main>
    </div>
  );
}
