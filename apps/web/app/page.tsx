import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { CatalogShowcase } from "@/components/home/CatalogShowcase";
import { TryonShowcase } from "@/components/home/TryonShowcase";
import { FinalCta } from "@/components/home/FinalCta";

export default async function HomePage() {
  const items = await db.select().from(catalogItems).limit(8);

  return (
    // bg-noir на обёртке, чтобы полоса под футером на коротких экранах
    // не проступала белым фоном body из светлой темы остальных разделов.
    <div className="flex flex-1 flex-col bg-noir">
      <Hero />
      <HowItWorks />
      <CatalogShowcase items={items} />
      <TryonShowcase />
      <FinalCta />
    </div>
  );
}
