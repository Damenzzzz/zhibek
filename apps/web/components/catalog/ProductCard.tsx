import Link from "next/link";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrl, colorSwatch } from "@/lib/catalogDisplay";
import { SkeletonImage } from "@/components/SkeletonImage";

interface ProductCardProps {
  id: string;
  category: string;
  color: string | null;
  description: string | null;
  imagePath: string;
}

export function ProductCard({ id, category, color, description, imagePath }: ProductCardProps) {
  const swatch = colorSwatch(color);
  const label = CATEGORY_LABELS[category as CatalogCategory] ?? category;

  return (
    <Link href={`/catalog/${id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden border border-line bg-bone-soft">
        <SkeletonImage
          src={catalogImageUrl(imagePath)}
          alt={description ?? label}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="group-hover:scale-[1.04]"
        />
        <span className="absolute left-2 top-2 bg-bone/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-ink-soft">
          {label}
        </span>
      </div>
      <div className="mt-2.5 space-y-1">
        {description && (
          <p className="line-clamp-2 text-[13px] leading-snug text-ink">{description}</p>
        )}
        {color && (
          <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink/15"
              style={{ backgroundColor: swatch ?? "transparent" }}
            />
            <span className="capitalize">{color}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
