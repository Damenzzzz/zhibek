import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
  return (
    <article className="group min-w-0">
      <div className="relative">
        <Link
          href={`/catalog/${id}`}
          className="relative block aspect-[3/4] overflow-hidden bg-white/70"
        >
          <SkeletonImage
            src={catalogImageUrl(imagePath)}
            alt={description ?? label}
            className="object-contain p-3"
          />
          <span className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full bg-canvas text-ink">
            <ArrowUpRight className="size-3.5" />
          </span>
        </Link>
        <SaveItemButton itemId={id} label={description ?? label} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase text-ink-soft">{label}</p>
        {color && (
          <span
            title={color}
            className="size-2.5 shrink-0 rounded-full ring-1 ring-hair-ink"
            style={{ backgroundColor: colorSwatch(color) ?? "transparent" }}
          />
        )}
      </div>
      <Link href={`/catalog/${id}`} className="mt-2 block">
        <h3 className="line-clamp-2 text-sm leading-relaxed first-letter:uppercase">
          {description ?? label}
        </h3>
      </Link>
      {color && (
        <p className="mt-1 text-xs text-ink-soft first-letter:uppercase">
          {color}
        </p>
      )}
    </article>
  );
}
