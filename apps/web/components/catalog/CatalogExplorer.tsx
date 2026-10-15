"use client";
import { useDeferredValue, useState } from "react";
import { Search, X, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import {
  matchesCatalogSearch,
  type CatalogEntry,
  type CatalogLook,
} from "@/lib/catalogView";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";
import { OutfitCard } from "./OutfitCard";

export function CatalogExplorer({
  items,
  looks,
  initialCategory,
  initialView,
  initialQuery,
}: {
  items: CatalogEntry[];
  looks: CatalogLook[];
  initialCategory?: string;
  initialView: string;
  initialQuery: string;
}) {
  const [category, setCategory] = useState(initialCategory ?? "all");
  const [view, setView] = useState(initialView === "looks" ? "looks" : "items");
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState("curated");
  const deferred = useDeferredValue(query);
  const matches = (item: CatalogEntry) =>
    (category === "all" || item.category === category) &&
    matchesCatalogSearch(item, deferred);
  const visibleItems = items.filter(matches);
  if (sort === "name")
    visibleItems.sort((a, b) =>
      (a.description ?? "").localeCompare(b.description ?? "", "ru"),
    );
  const visibleLooks = looks.filter(
    (look) =>
      look.items.some(matches) ||
      (category === "all" &&
        look.title
          .toLocaleLowerCase("ru")
          .includes(deferred.toLocaleLowerCase("ru"))),
  );
  if (sort === "name")
    visibleLooks.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  const count = view === "items" ? visibleItems.length : visibleLooks.length;
  function updateUrl(next: { category?: string; view?: string; q?: string }) {
    const params = new URLSearchParams();
    const c = next.category ?? category,
      v = next.view ?? view,
      q = next.q ?? query;
    if (c !== "all") params.set("category", c);
    if (v === "looks") params.set("view", v);
    if (q.trim()) params.set("q", q.trim());
    window.history.replaceState(
      null,
      "",
      `/catalog${params.size ? "?" + params : ""}`,
    );
  }
  function reset() {
    setCategory("all");
    setQuery("");
    setSort("curated");
    updateUrl({ category: "all", q: "" });
  }
  return (
    <section className="site-container pb-20 pt-8 sm:pb-28">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div
          className="inline-flex gap-1 rounded-full border border-hair-ink bg-canvas-2/40 p-1"
          aria-label="Вид каталога"
        >
          {[
            ["items", "Отдельные вещи"],
            ["looks", "Готовые образы"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => {
                setView(value);
                updateUrl({ view: value });
              }}
              className={cn(
                "min-h-10 rounded-full px-4 text-xs sm:px-5",
                view === value
                  ? "bg-ink text-canvas"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex w-full items-center gap-3 rounded-full border border-hair-ink bg-white/40 px-4 sm:w-80">
          <Search className="size-4 shrink-0 text-ink-soft" />
          <input
            type="search"
            placeholder="Название, цвет или артикул"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              updateUrl({ q: e.target.value });
            }}
            className="min-h-12 w-full min-w-0 bg-transparent text-sm outline-none"
            aria-label="Поиск в каталоге"
          />
        </label>
      </div>
      <div
        className="no-scrollbar mt-7 flex gap-2 overflow-x-auto border-b border-hair-ink pb-5"
        aria-label="Категории"
      >
        {[
          ["all", "Все вещи"],
          ...CATEGORIES.map((value) => [value, CATEGORY_LABELS[value]]),
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={category === value}
            onClick={() => {
              setCategory(value);
              updateUrl({ category: value });
            }}
            className={cn(
              "min-h-10 shrink-0 rounded-full border px-4 text-xs",
              category === value
                ? "border-clay bg-clay/5 text-clay"
                : "border-hair-ink text-ink-soft hover:border-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 py-6">
        <p aria-live="polite" className="text-xs tabular-nums text-ink-soft">
          {view === "items" ? "Вещей" : "Образов"}: {count}
          {query && ` · «${query}»`}
        </p>
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          Порядок{" "}
          <select
            aria-label="Сортировка"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="min-h-10 bg-transparent text-ink"
          >
            <option value="curated">Выбор Smart Fashion</option>
            <option value="name">По названию</option>
          </select>
        </label>
      </div>
      {count === 0 ? (
        <div className="rounded-2xl border border-hair-ink bg-canvas-2/30 px-5 py-16 text-center">
          <Search className="mx-auto size-7 text-ink-soft" />
          <h2 className="mt-5 font-display text-2xl">Пока ничего не нашлось</h2>
          <p className="mt-3 text-pretty text-sm text-ink-soft">
            Попробуй другое название, цвет или категорию.
          </p>
          <button
            onClick={reset}
            type="button"
            className="button-secondary mt-6"
          >
            <X className="size-4" />
            Сбросить фильтры
          </button>
        </div>
      ) : view === "items" ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
          {visibleItems.map((item) => (
            <ProductCard key={item.id} {...item} />
          ))}
        </div>
      ) : (
        <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {visibleLooks.map((look, i) => (
            <OutfitCard key={look.id} look={look} index={i + 1} />
          ))}
        </div>
      )}
      <div className="mt-14 flex flex-wrap items-center justify-between gap-5 border-t border-hair-ink pt-7">
        <p className="max-w-md text-pretty text-sm leading-relaxed text-ink-soft">
          Сохраняй понравившиеся вещи в примерочную — твоя подборка останется в
          этом браузере.
        </p>
        <Link
          href="/fitting-room"
          className="inline-flex items-center gap-3 text-sm"
        >
          Моя примерочная <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
