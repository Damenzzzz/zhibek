import { Suspense } from "react";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
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

  // "Готовые образы" — только пары верх+низ из одного look_id, как и раньше;
  // обувь/сумку туда не подмешиваем (осознанное упрощение — выбираются
  // отдельно в своих секциях).
  const looksById = new Map<string, { topItem?: (typeof items)[number]; bottomItem?: (typeof items)[number] }>();
  for (const item of items) {
    const entry = looksById.get(item.lookId) ?? {};
    if (item.category === "top" || item.category === "outerwear") entry.topItem = item;
    if (item.category === "bottom") entry.bottomItem = item;
    looksById.set(item.lookId, entry);
  }
  const looks = Array.from(looksById.entries())
    .filter(([, entry]) => entry.topItem && entry.bottomItem)
    .map(([lookId, entry]) => ({ lookId, topItem: entry.topItem!, bottomItem: entry.bottomItem! }));

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
