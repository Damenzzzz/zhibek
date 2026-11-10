"use client";
import { useDeferredValue, useState } from "react";
import { ArrowUpRight, Bookmark, Search, X } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import {
  matchesCatalogSearch,
  type CatalogEntry,
  type CatalogLook,
} from "@/lib/catalogView";
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
    <section className="site-container pb-20 pt-8 sm:pb-28 sm:pt-10">
      {/* Панель фильтров прилипает под шапкой, чтобы переключать категории,
          не возвращаясь наверх длинной сетки. */}
      <div className="relative z-30 -mx-5 border-b border-hair-ink bg-canvas/92 px-5 pb-4 pt-4 backdrop-blur-md sm:-mx-8 sm:px-8 lg:-mx-14 lg:px-14 sm:sticky sm:top-[4.5rem]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="segmented" role="group" aria-label="Вид каталога">
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
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative w-full sm:w-80">
            <span className="sr-only">Поиск в каталоге</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
            />
            <input
              type="search"
              placeholder="Название, цвет или артикул"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                updateUrl({ q: e.target.value });
              }}
              className="field rounded-full pl-11 pr-11"
            />
            {query && (
              <button
                type="button"
                aria-label="Очистить поиск"
                onClick={() => {
                  setQuery("");
                  updateUrl({ q: "" });
                }}
                className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft hover:bg-canvas-2 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>
        <div
          className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0"
          role="group"
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
              className="chip shrink-0 whitespace-nowrap"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 py-6">
        <p aria-live="polite" className="text-sm tabular-nums text-ink-soft">
          {view === "items" ? "Вещей" : "Образов"}:{" "}
          <span className="font-medium text-ink">{count}</span>
          {query && ` · «${query}»`}
        </p>
        <label className="flex items-center gap-3 text-sm text-ink-soft">
          Порядок
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="field min-h-10 w-auto rounded-full py-2 pl-4 text-sm"
          >
            <option value="curated">Выбор Smart Fashion</option>
            <option value="name">По названию</option>
          </select>
        </label>
      </div>
      {count === 0 ? (
        <div className="panel px-5 py-16 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-canvas-2">
            <Search className="size-6 text-ink-soft" strokeWidth={1.5} />
          </span>
          <h2 className="mt-6 font-display text-3xl">Пока ничего не нашлось</h2>
          <p className="mt-3 text-pretty text-[15px] text-ink-soft">
            Попробуй другое название, цвет или категорию.
          </p>
          <button
            onClick={reset}
            type="button"
            className="button-secondary mt-7"
          >
            <X className="size-4" />
            Сбросить фильтры
          </button>
        </div>
      ) : view === "items" ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
          {visibleItems.map((item) => (
            <ProductCard key={item.id} {...item} />
          ))}
        </div>
      ) : (
        <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {visibleLooks.map((look, i) => (
            <OutfitCard key={look.id} look={look} index={i + 1} />
          ))}
        </div>
      )}
      <div className="panel mt-16 flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-clay/10">
            <Bookmark className="size-5 text-clay" strokeWidth={1.6} />
          </span>
          <p className="max-w-md text-pretty text-[15px] leading-relaxed text-ink-soft">
            Сохраняй понравившиеся вещи в примерочную — твоя подборка останется
            в этом браузере.
          </p>
        </div>
        <Link href="/fitting-room" className="button-dark">
          Моя примерочная <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
