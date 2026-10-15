"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import type { CatalogLook } from "@/lib/catalogView";
import { SkeletonImage } from "@/components/SkeletonImage";

export function OutfitCard({
  look,
  index,
}: {
  look: CatalogLook;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article>
      <Link
        href={`/tryon?look=${encodeURIComponent(look.id)}`}
        className="group relative block overflow-hidden bg-canvas-2"
      >
        <div className="relative aspect-[3/4]">
          <SkeletonImage
            src={look.cover}
            fallbackSrc={look.fallback}
            alt={look.title}
            sizes="(max-width:640px) 90vw, (max-width:1024px) 45vw, 30vw"
          />
        </div>
        <span className="absolute left-4 top-4 rounded-full bg-canvas px-3 py-1.5 text-[10px] tabular-nums">
          Smart Fashion EDIT / {String(index).padStart(2, "0")}
        </span>
        <span className="absolute bottom-4 right-4 flex size-11 items-center justify-center rounded-full bg-canvas text-ink group-hover:bg-clay group-hover:text-canvas">
          <ArrowUpRight className="size-5" />
        </span>
      </Link>
      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="truncate font-display text-xl">{look.title}</h3>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="min-h-11 shrink-0 text-xs text-ink-soft underline underline-offset-4"
        >
          {expanded ? "Скрыть состав" : `Состав · ${look.items.length}`}
        </button>
      </div>
      {expanded && (
        <ul className="mt-2 space-y-2 border-t border-hair-ink pt-3">
          {look.items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/catalog/${item.id}`}
                className="inline-flex min-h-9 items-center text-sm text-ink-soft hover:text-clay"
              >
                {item.description ?? item.category}{" "}
                <ArrowUpRight className="ml-2 size-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/tryon?look=${encodeURIComponent(look.id)}`}
        className="mt-2 inline-flex min-h-9 items-center gap-2 text-xs text-clay"
      >
        Примерить этот образ <ArrowUpRight className="size-3.5" />
      </Link>
    </article>
  );
}
