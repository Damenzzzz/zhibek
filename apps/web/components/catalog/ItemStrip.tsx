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
      <p className="border-b border-hair-ink pb-2.5 font-grotesk text-[10px] uppercase tracking-[0.3em] text-ink-soft">{title}</p>
      <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link key={item.id} href={`/catalog/${item.id}`} className="group w-24 shrink-0 sm:w-28">
            <div className="relative aspect-[3/4] overflow-hidden bg-canvas-2 ring-1 ring-hair-ink transition-all group-hover:ring-clay">
              <SkeletonImage
                src={catalogImageUrl(item.imagePath)}
                alt={item.description ?? item.category}
                sizes="112px"
                className="duration-500 group-hover:scale-105"
                placeholderClassName="bg-canvas-2"
              />
            </div>
            <p className="mt-2 font-grotesk text-[10px] uppercase tracking-[0.16em] text-ink-soft">
              {CATEGORY_LABELS[item.category as CatalogCategory] ?? item.category}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
