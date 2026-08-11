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
    <div className="flex flex-1 flex-col">
      <Hero />
      <HowItWorks />
      <CatalogShowcase items={items} />
      <TryonShowcase />
      <FinalCta />
    </div>
  );
}
