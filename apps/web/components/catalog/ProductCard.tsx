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
  /** Порядковый номер в сетке — печатается на кропе как в журнальной подборке. */
  index?: number;
}

export function ProductCard({ id, category, color, description, imagePath, index }: ProductCardProps) {
  const swatch = colorSwatch(color);
  const label = CATEGORY_LABELS[category as CatalogCategory] ?? category;

  return (
    <Link href={`/catalog/${id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-canvas-2 ring-1 ring-inset ring-hair-ink">
        <SkeletonImage
          src={catalogImageUrl(imagePath)}
          alt={description ?? label}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="duration-700 group-hover:scale-[1.05]"
          placeholderClassName="bg-canvas-2"
        />
        <span className="absolute left-0 top-0 bg-canvas px-3 py-2 font-grotesk text-[9px] uppercase tracking-[0.24em] text-ink-soft">
          {label}
        </span>
        {index !== undefined && (
          <span className="absolute right-3 top-2.5 font-display text-sm text-canvas mix-blend-difference">
            {String(index).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <p className="line-clamp-2 font-grotesk text-[13px] leading-snug text-ink">
          {description ?? label}
        </p>
        {color && (
          <span
            aria-hidden
            title={color}
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-hair-ink"
            style={{ backgroundColor: swatch ?? "transparent" }}
          />
        )}
      </div>

      {/* Нить, протягивающаяся под карточкой по наведению */}
      <span className="mt-3 block h-px w-full bg-hair-ink">
        <span className="block h-px w-0 bg-clay transition-all duration-500 ease-out group-hover:w-full" />
      </span>
    </Link>
  );
}
