import { Suspense } from "react";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { TryonForm } from "@/components/tryon/TryonForm";

export default async function TryonPage() {
  const items = await db
    .select()
    .from(catalogItems)
    .where(inArray(catalogItems.category, ["top", "outerwear", "bottom", "shoes", "bag"]));

  const tops = items.filter((item) => item.category === "top" || item.category === "outerwear");
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
  const looks = Array.from(looksById.entries())
    .map(([lookId, lookItems]) => {
      const first = (cat: string) => lookItems.find((i) => i.category === cat);
      const outerwear = first("outerwear");
      const top = first("top");
      const bottom = first("bottom");
      const shoesItem = first("shoes");
      const bag = first("bag");
      const slots = [outerwear, top, bottom, shoesItem, bag].filter((i): i is (typeof items)[number] => Boolean(i));
      const rep = outerwear ?? top ?? slots[0];
      return {
        lookId,
        cover: `/catalog/looks/${lookId}.jpg`,
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
      const na = Number(a.lookId);
      const nb = Number(b.lookId);
      return Number.isNaN(na) || Number.isNaN(nb) ? a.lookId.localeCompare(b.lookId) : na - nb;
    });

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="relative overflow-hidden border-b border-hair-ink bg-canvas-2 pb-14 pt-32 sm:pb-16 sm:pt-36">
        <div className="warp-lines pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative z-10 mx-auto flex w-full max-w-[88rem] flex-wrap items-end justify-between gap-6 px-5 sm:px-8 lg:px-14">
          <div>
            <span className="tag text-ink-soft">примерка</span>
            <h1 className="mt-5 font-display text-[clamp(2.25rem,6vw,4.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
              Собери
              <br />
              <span className="stroke-clay">образ</span>
            </h1>
          </div>
          <p className="max-w-xs font-grotesk text-[13px] leading-relaxed text-ink-soft">
            Верх, низ, обувь и сумка по отдельности — или готовый образ целиком одним
            касанием. Ленты листаются стрелками.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[88rem] flex-1 px-5 pb-20 pt-10 sm:px-8 lg:px-14">
        <Suspense fallback={null}>
          <TryonForm tops={tops} bottoms={bottoms} shoes={shoes} bags={bags} looks={looks} />
        </Suspense>
      </main>
    </div>
  );
}
