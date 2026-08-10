"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SkeletonImage } from "@/components/SkeletonImage";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { useFittingRoomIds, removeFittingRoomItem } from "@/lib/fittingRoomStorage";

interface Item {
  id: string;
  category: string;
  color: string | null;
  description: string | null;
  imagePath: string;
}

export default function FittingRoomPage() {
  const ids = useFittingRoomIds();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    const request =
      ids.length === 0
        ? Promise.resolve([])
        : Promise.all(
            ids.map((id) =>
              fetch(`/api/catalog/${id}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => data?.item as Item | null)
            )
          );

    request.then((results) => {
      if (!cancelled) setItems(results.filter((item): item is Item => item !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  function goToTryon() {
    const top = items.find((item) => item.category === "top" || item.category === "outerwear");
    const bottom = items.find((item) => item.category === "bottom");
    const params = new URLSearchParams();
    if (top) params.set("top", top.id);
    if (bottom) params.set("bottom", bottom.id);
    router.push(`/tryon${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-[11px] uppercase tracking-[0.3em] text-accent">Примерочная</p>
        <div className="mt-2 h-[2px] w-12 bg-gradient-to-r from-gold to-transparent" />
        <h1 className="mt-3 font-display text-4xl italic tracking-tight text-ink">Твой список</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Товары, отложенные кнопкой «Добавить к примерке» на страницах каталога.
        </p>

        {ids.length === 0 ? (
          <div className="mt-10 border border-line bg-bone-soft px-5 py-16 text-center">
            <p className="text-sm text-ink-soft">
              Примерочная пуста — добавляй товары кнопкой «Добавить к примерке» в каталоге.
            </p>
            <Link
              href="/catalog"
              className="mt-4 inline-block border border-accent bg-accent px-5 py-2.5 text-sm font-medium uppercase tracking-[0.1em] text-bone transition-colors hover:bg-accent/90"
            >
              В каталог
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <div key={item.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => removeFittingRoomItem(item.id)}
                    aria-label="Убрать из примерочной"
                    className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center border border-line bg-bone/90 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
                  >
                    ×
                  </button>
                  <Link href={`/catalog/${item.id}`}>
                    <div className="relative aspect-[3/4] overflow-hidden border border-line bg-bone-soft">
                      <SkeletonImage
                        src={catalogImageUrl(item.imagePath)}
                        alt={item.description ?? item.category}
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-ink">
                      {item.description ?? CATEGORY_LABELS[item.category as CatalogCategory]}
                    </p>
                  </Link>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={goToTryon}
              className="mt-8 w-full border border-accent bg-accent px-6 py-3 text-sm font-medium uppercase tracking-[0.1em] text-bone transition-colors hover:bg-accent/90 sm:w-auto"
            >
              Перейти к примерке
            </button>
          </>
        )}
      </main>
    </div>
  );
}
