import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems, looks } from "@/lib/schema";
import { buildCatalogLooks } from "@/lib/catalogView";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CatalogShowcase } from "@/components/home/CatalogShowcase";
import { About } from "@/components/home/About";
import { TryonShowcase } from "@/components/home/TryonShowcase";
import { FinalCta } from "@/components/home/FinalCta";
import { Questions } from "@/components/home/Questions";

// Каталог синхронизируется в БД (Turso) на старте сервера (instrumentation.ts),
// а не во время сборки. Без этого главная пререндерилась статикой на этапе
// build со старым составом каталога — и после обновления показывала карточки
// с уже удалёнными фото (пустые квадратики), тогда как /catalog (динамическая)
// отдавала актуальные. Рендерим главную по запросу, как и каталог.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [items, lookRows] = await Promise.all([
    db
      .select()
      .from(catalogItems)
      .orderBy(asc(catalogItems.sortIndex), asc(catalogItems.id)),
    db.select().from(looks),
  ]);
  const outfits = buildCatalogLooks(items, lookRows);

  // Ритм полос: кость → песок → эспрессо → кость → песок → терракота,
  // дальше тёмный подвал. Одна тёмная и одна цветная плашка на всю страницу —
  // остальное светлое.
  return (
    <main className="flex flex-1 flex-col bg-canvas">
      <Hero />
      <CatalogShowcase looks={outfits} />
      <TryonShowcase />
      <HowItWorks />
      <About />
      <Questions />
      <FinalCta />
    </main>
  );
}
