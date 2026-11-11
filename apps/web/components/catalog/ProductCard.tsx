import Link from "next/link";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrl, colorSwatch } from "@/lib/catalogDisplay";
import { SkeletonImage } from "@/components/SkeletonImage";
import { SaveItemButton } from "@/components/catalog/SaveItemButton";

interface ProductCardProps {
  id: string;
  category: string;
  color: string | null;
  description: string | null;
  imagePath: string;
  index?: number;
}
export function ProductCard({
  id,
  category,
  color,
  description,
  imagePath,
}: ProductCardProps) {
  const label = CATEGORY_LABELS[category as CatalogCategory] ?? category;
  const swatch = colorSwatch(color);
  return (
    <article className="group relative min-w-0">
      <div className="relative">
        <Link
          href={`/catalog/${id}`}
          className="media-well block aspect-[3/4] transition-shadow duration-300 group-hover:shadow-soft"
        >
          <SkeletonImage
            src={catalogImageUrl(imagePath)}
            alt={description ?? label}
            sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
            className="media-product transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            placeholderClassName="skeleton"
          />
          <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft backdrop-blur">
            {label}
          </span>
        </Link>
        <SaveItemButton itemId={id} label={description ?? label} />
      </div>
      <Link href={`/catalog/${id}`} className="mt-4 block">
        <h3 className="line-clamp-2 text-[15px] leading-snug transition-colors first-letter:uppercase group-hover:text-clay">
          {description ?? label}
        </h3>
      </Link>
      {color && (
        <p className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-soft">
          {swatch && (
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(42,33,28,0.18)]"
              style={{ backgroundColor: swatch }}
            />
          )}
          <span className="truncate first-letter:uppercase">{color}</span>
        </p>
      )}
    </article>
  );
}
