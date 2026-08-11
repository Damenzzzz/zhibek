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
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-8 pt-24 sm:px-6 sm:pb-12 sm:pt-28">
        <span className="eyebrow">Примерка</span>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Собери образ</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Выбери верх, низ, обувь и сумку по отдельности или возьми целиком готовый образ.
        </p>

        <Suspense fallback={null}>
          <TryonForm tops={tops} bottoms={bottoms} shoes={shoes} bags={bags} looks={looks} />
        </Suspense>
      </main>
    </div>
  );
}
