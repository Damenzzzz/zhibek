"use client";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { CatalogLook } from "@/lib/catalogView";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrl, colorSwatch } from "@/lib/catalogDisplay";
import { SkeletonImage } from "@/components/SkeletonImage";
import { Tilt } from "@/components/Tilt";
import { ITEM_FORMS, cn, pluralRu } from "@/lib/utils";

export function OutfitCard({
  look,
  index,
}: {
  look: CatalogLook;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const tryonHref = `/tryon?look=${encodeURIComponent(look.id)}`;
  // Палитра образа: по точке на каждый цвет вещей, без повторов.
  const swatches = Array.from(
    new Map(
      look.items
        .map((item) => [colorSwatch(item.color), item.color] as const)
        .filter((entry): entry is readonly [string, string | null] =>
          Boolean(entry[0]),
        ),
    ),
  ).slice(0, 6);

  return (
    <article className="group/card">
      <Tilt max={4} className="rounded-[1.25rem]">
        <Link
          href={tryonHref}
          aria-label={`Примерить: ${look.title}`}
          className="group relative block overflow-hidden rounded-[1.25rem] bg-media"
        >
          <div className="relative aspect-[3/4]">
            {/* Лёгкий scale срезает края обложек: часть из них вырезана из
              коллажей, и по краю остаются обрывки подписей. */}
            <SkeletonImage
              src={look.cover}
              fallbackSrc={look.fallback}
              alt={look.title}
              sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 30vw"
              className="scale-[1.04] object-[50%_35%] transition-transform duration-700 ease-out group-hover:scale-[1.09]"
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-espresso/55 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          <span className="absolute left-4 top-4 rounded-full bg-surface/90 px-3 py-1.5 font-display text-[13px] tracking-[0.08em] tabular-nums backdrop-blur">
            № {String(index).padStart(2, "0")}
          </span>
          <span className="absolute bottom-4 left-4 translate-y-2 text-sm font-medium text-canvas opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            Примерить на себе
          </span>
          <span className="absolute bottom-4 right-4 flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-soft transition-colors duration-200 group-hover:bg-clay group-hover:text-canvas">
            <ArrowUpRight className="size-5" />
          </span>
        </Link>
      </Tilt>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-2xl leading-tight">
            {look.title}
          </h3>
          <p className="mt-1.5 text-sm text-ink-soft">
            {pluralRu(look.items.length, ITEM_FORMS)}
          </p>
        </div>
        {swatches.length > 0 && (
          <ul
            className="mt-2 flex shrink-0 -space-x-1.5"
            aria-label="Цвета образа"
          >
            {swatches.map(([hex, name]) => (
              <li
                key={hex}
                title={name ?? undefined}
                className="size-5 rounded-full shadow-[inset_0_0_0_1px_rgba(42,33,28,0.18)] ring-2 ring-canvas"
                style={{ backgroundColor: hex }}
              >
                <span className="sr-only">{name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link href={tryonHref} className="button-dark button-sm">
          Примерить образ
        </Link>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm text-ink-soft transition-colors hover:bg-canvas-2/70 hover:text-ink"
        >
          Состав
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        </button>
      </div>

      {expanded && (
        <ul
          id={listId}
          className="mt-3 animate-fade-in divide-y divide-hair-ink rounded-2xl border border-hair-ink bg-surface/70"
        >
          {look.items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/catalog/${item.id}`}
                className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:text-clay"
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-media">
                  <SkeletonImage
                    src={catalogImageUrl(item.imagePath)}
                    alt=""
                    sizes="48px"
                    className="media-product p-1"
                    placeholderClassName="bg-media"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                    {CATEGORY_LABELS[item.category as CatalogCategory] ??
                      item.category}
                  </span>
                  <span className="mt-0.5 block truncate first-letter:uppercase">
                    {item.description ?? item.category}
                  </span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-ink-soft" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
