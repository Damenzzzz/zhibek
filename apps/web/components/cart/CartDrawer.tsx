"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
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

// Выезжающая справа корзина ("примерочная") — использует то же localStorage-
// хранилище, что и страница /fitting-room (см. lib/fittingRoomStorage.ts),
// просто даёт доступ к нему из любого места сайта через иконку в хедере.
export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  function goToTryon() {
    const top = items.find((item) => item.category === "top" || item.category === "outerwear");
    const bottom = items.find((item) => item.category === "bottom");
    const params = new URLSearchParams();
    if (top) params.set("top", top.id);
    if (bottom) params.set("bottom", bottom.id);
    onClose();
    router.push(`/tryon${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div
      className={
        "fixed inset-0 z-50 transition-opacity " + (open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")
      }
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />

      <aside
        className={
          "absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShoppingBag className="h-4.5 w-4.5" strokeWidth={1.75} />
            Примерочная{items.length > 0 && <span className="text-ink-soft">· {items.length}</span>}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-soft hover:text-ink"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag className="h-9 w-9 text-line" strokeWidth={1.25} />
              <p className="text-sm text-ink-soft">Пока пусто — добавляй вещи из каталога.</p>
              <Link
                href="/catalog"
                onClick={onClose}
                className="mt-1 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                В каталог
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <Link
                    href={`/catalog/${item.id}`}
                    onClick={onClose}
                    className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xl bg-paper-soft"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={catalogImageUrl(item.imagePath)}
                      alt={item.description ?? item.category}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col justify-center gap-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-soft">
                      {CATEGORY_LABELS[item.category as CatalogCategory] ?? item.category}
                    </p>
                    <p className="line-clamp-2 text-sm text-ink">{item.description ?? "—"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFittingRoomItem(item.id)}
                    aria-label="Убрать"
                    className="flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full text-ink-soft transition-colors hover:bg-paper-soft hover:text-ink"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-line px-5 py-4">
            <button
              type="button"
              onClick={goToTryon}
              className="w-full rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Перейти к примерке
            </button>
            <Link
              href="/fitting-room"
              onClick={onClose}
              className="w-full rounded-full border border-line px-6 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:border-ink/40"
            >
              Открыть примерочную
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
