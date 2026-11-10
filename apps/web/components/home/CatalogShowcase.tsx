import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { OutfitCard } from "@/components/catalog/OutfitCard";
import type { CatalogLook } from "@/lib/catalogView";

export function CatalogShowcase({ looks }: { looks: CatalogLook[] }) {
  if (!looks.length) return null;
  return (
    <section className="section-space">
      <div className="site-container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="label text-clay">Собрано, чтобы вдохновлять</span>
            <h2 className="section-title mt-5">
              Образы <span className="accent-italic">с характером</span>
            </h2>
            <p className="lead mt-5 max-w-lg">
              Готовые комплекты от верха до сумки. Выбери любой — и примерь
              целиком за один раз.
            </p>
          </div>
          <Link href="/catalog?view=looks" className="button-secondary">
            Вся коллекция <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {looks.slice(0, 3).map((look, i) => (
            <div
              key={look.id}
              className="on-view"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <OutfitCard look={look} index={i + 1} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
