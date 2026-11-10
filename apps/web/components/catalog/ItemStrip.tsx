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

export function ItemStrip({
  title,
  items,
}: {
  title: string;
  items: StripItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="flex items-baseline justify-between border-b border-hair-ink pb-3 font-display text-xl">
        {title}
        <span className="font-sans text-[13px] tabular-nums text-ink-soft">
          {items.length}
        </span>
      </h2>
      <div className="no-scrollbar -mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
        {items.map((item) => {
          const label =
            CATEGORY_LABELS[item.category as CatalogCategory] ?? item.category;
          return (
            <Link
              key={item.id}
              href={`/catalog/${item.id}`}
              className="group w-28 shrink-0 sm:w-32"
            >
              <div className="media-well aspect-[3/4] ring-1 ring-transparent transition-shadow duration-200 group-hover:ring-clay">
                <SkeletonImage
                  src={catalogImageUrl(item.imagePath)}
                  alt={item.description ?? label}
                  sizes="128px"
                  className="media-product transition-transform duration-500 group-hover:scale-105"
                  placeholderClassName="bg-media"
                />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                {label}
              </p>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug transition-colors first-letter:uppercase group-hover:text-clay">
                {item.description ?? label}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
