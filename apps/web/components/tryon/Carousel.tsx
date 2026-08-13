"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Горизонтальная лента с листалкой. Раньше строки товаров просто уезжали за
// правый край: на десктопе полосы прокрутки нет, и было не видно, что дальше
// есть ещё вещи — казалось, что в примерку попал не весь каталог.
// Стрелки показываются только когда есть куда листать.
export function Carousel({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // 2px допуска: дробный scrollWidth иначе не даёт долистать до конца
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, children]);

  function scrollBy(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    // Листаем почти на экран, оставляя одну карточку внахлёст как якорь
    el.scrollBy({ left: direction * (el.clientWidth * 0.85), behavior: "smooth" });
  }

  const hasOverflow = !atStart || !atEnd;

  return (
    <section>
      <div className="flex items-center justify-between gap-4 border-b border-hair-ink pb-2.5">
        <p className="font-grotesk text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          {title}
          {count !== undefined && <span className="ml-2 text-clay">{count}</span>}
        </p>

        {hasOverflow && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              aria-label={`${title}: назад`}
              className="flex h-8 w-8 items-center justify-center border border-hair-ink text-ink transition-colors hover:border-ink hover:bg-ink hover:text-canvas disabled:cursor-not-allowed disabled:border-hair-ink disabled:bg-transparent disabled:text-ink-soft/40"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              aria-label={`${title}: вперёд`}
              className="flex h-8 w-8 items-center justify-center border border-hair-ink text-ink transition-colors hover:border-ink hover:bg-ink hover:text-canvas disabled:cursor-not-allowed disabled:border-hair-ink disabled:bg-transparent disabled:text-ink-soft/40"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={trackRef}
          onScroll={measure}
          className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-1 pt-4"
        >
          {children}
        </div>

        {/* Растушёвка у края — подсказка, что лента продолжается */}
        {!atEnd && (
          <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-canvas to-transparent" />
        )}
      </div>
    </section>
  );
}
