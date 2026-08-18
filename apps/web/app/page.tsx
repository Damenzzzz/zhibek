import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CatalogShowcase } from "@/components/home/CatalogShowcase";
import { About } from "@/components/home/About";
import { TryonShowcase } from "@/components/home/TryonShowcase";
import { FinalCta } from "@/components/home/FinalCta";

// Каталог синхронизируется в БД (Turso) на старте сервера (instrumentation.ts),
// а не во время сборки. Без этого главная пререндерилась статикой на этапе
// build со старым составом каталога — и после обновления показывала карточки
// с уже удалёнными фото (пустые квадратики), тогда как /catalog (динамическая)
// отдавала актуальные. Рендерим главную по запросу, как и каталог.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const items = await db.select().from(catalogItems).limit(8);

  // Ритм полос: кость → песок → эспрессо → кость → песок → терракота,
  // дальше тёмный подвал. Одна тёмная и одна цветная плашка на всю страницу —
  // остальное светлое.
  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <Hero />
      <HowItWorks />
      <CatalogShowcase items={items} />
      <About />
      <TryonShowcase />
      <FinalCta />
    </div>
  );
}
