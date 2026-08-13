import Link from "next/link";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrl, colorSwatch } from "@/lib/catalogDisplay";
import { SkeletonImage } from "@/components/SkeletonImage";

interface LookCardProps {
  id: string;
  index: number;
  category: string;
  color: string | null;
  description: string | null;
  imagePath: string;
}

// Тёмный вариант карточки для главной. Отдельный компонент, а не пропс к
// catalog/ProductCard: у той карточки светлая тема и скруглённые углы, она
// живёт на /catalog и менять её ради витрины не нужно.
export function LookCard({ id, index, category, color, description, imagePath }: LookCardProps) {
  const swatch = colorSwatch(color);
  const label = CATEGORY_LABELS[category as CatalogCategory] ?? category;

  return (
    <Link href={`/catalog/${id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-canvas-2">
        <SkeletonImage
          src={catalogImageUrl(imagePath)}
          alt={description ?? label}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 24vw"
          className="duration-700 group-hover:scale-[1.06]"
          placeholderClassName="bg-canvas-2"
        />
        <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-hair" />

        <span className="absolute left-0 top-0 bg-espresso px-3 py-2 font-grotesk text-[9px] uppercase tracking-[0.28em] text-canvas-dim">
          {label}
        </span>
        <span className="absolute right-3 top-2.5 font-editorial text-sm text-canvas/45">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <p className="line-clamp-2 font-grotesk text-[13px] leading-snug text-canvas/85">
          {description ?? label}
        </p>
        {color && (
          <span
            aria-hidden
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-hair"
            style={{ backgroundColor: swatch ?? "transparent" }}
          />
        )}
      </div>

      {/* Нить, «протягивающаяся» под карточкой по наведению */}
      <span className="mt-3 block h-px w-full bg-hair">
        <span className="block h-px w-0 bg-clay transition-all duration-500 ease-out group-hover:w-full" />
      </span>
    </Link>
  );
}
