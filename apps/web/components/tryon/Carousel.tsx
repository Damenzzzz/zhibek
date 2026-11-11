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
      <div className="flex items-center justify-between gap-4 border-b border-hair-ink pb-2">
        <h2 className="flex items-baseline gap-2 font-display text-xl">
          {title}
          {count !== undefined && (
            <span className="font-sans text-[13px] tabular-nums text-ink-soft">
              {count}
            </span>
          )}
        </h2>

        {hasOverflow && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              aria-label={`${title}: назад`}
              className="flex size-10 items-center justify-center rounded-full border border-hair-ink text-ink transition-colors hover:border-espresso hover:bg-espresso hover:text-canvas disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              aria-label={`${title}: вперёд`}
              className="flex size-10 items-center justify-center rounded-full border border-hair-ink text-ink transition-colors hover:border-espresso hover:bg-espresso hover:text-canvas disabled:pointer-events-none disabled:opacity-35"
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
          className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto scroll-smooth px-1 pb-2 pt-4 *:snap-start sm:gap-4"
        >
          {children}
        </div>

        {/* Растушёвка у края — подсказка, что лента продолжается */}
        {!atEnd && (
          <span className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-canvas to-transparent" />
        )}
      </div>
    </section>
  );
}
