import { Suspense } from "react";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { SiteHeader } from "@/components/SiteHeader";
import { TryonForm } from "@/components/tryon/TryonForm";

export default async function TryonPage() {
  const items = await db
    .select()
    .from(catalogItems)
    .where(inArray(catalogItems.category, ["top", "outerwear", "bottom"]));

  const tops = items.filter((item) => item.category === "top" || item.category === "outerwear");
  const bottoms = items.filter((item) => item.category === "bottom");

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
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-[11px] uppercase tracking-[0.3em] text-accent">Примерка</p>
        <div className="mt-2 h-[2px] w-12 bg-gradient-to-r from-gold to-transparent" />
        <h1 className="mt-3 font-display text-4xl italic tracking-tight text-ink">Собери образ</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Выбери верх и/или низ по отдельности или возьми целиком готовый образ.
        </p>

        <Suspense fallback={null}>
          <TryonForm tops={tops} bottoms={bottoms} looks={looks} />
        </Suspense>
      </main>
    </div>
  );
}
