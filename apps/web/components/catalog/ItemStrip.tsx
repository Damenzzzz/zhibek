import Link from "next/link";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { SkeletonImage } from "@/components/SkeletonImage";

interface StripItem {
  id: string;
  category: string;
  description: string | null;
  imagePath: string;
}

export function ItemStrip({ title, items }: { title: string; items: StripItem[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">{title}</p>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link key={item.id} href={`/catalog/${item.id}`} className="group w-24 shrink-0 sm:w-28">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-paper-soft">
              <SkeletonImage
                src={catalogImageUrl(item.imagePath)}
                alt={item.description ?? item.category}
                sizes="112px"
                className="group-hover:scale-105"
              />
            </div>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              {CATEGORY_LABELS[item.category as CatalogCategory] ?? item.category}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
