import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { OutfitCard } from "@/components/catalog/OutfitCard";
import type { CatalogLook } from "@/lib/catalogView";

export function CatalogShowcase({ looks }: { looks: CatalogLook[] }) {
  if (!looks.length) return null;
  return (
    <section className="section-space">
      <div className="site-container">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="tag text-ink-soft">
              Собрано, чтобы вдохновлять
            </span>
            <h2 className="section-title mt-5">Образы с характером</h2>
          </div>
          <Link
            href="/catalog?view=looks"
            className="inline-flex items-center gap-3 border-b border-ink pb-2 text-sm"
          >
            Вся коллекция <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {looks.slice(0, 3).map((look, i) => (
            <OutfitCard key={look.id} look={look} index={i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
