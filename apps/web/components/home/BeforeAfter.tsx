"use client";

import { useEffect, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { SkeletonImage } from "@/components/SkeletonImage";

interface BeforeAfterProps {
  before: string;
  after: string;
}

// Шторка «до / после». Управление — нативный range, растянутый на всё фото и
// сведённый к opacity-0: он даёт перетаскивание мышью, тап на телефоне и
// стрелки с клавиатуры без единого обработчика указателя. Видимая ручка —
// отдельный слой без событий, позиция обоих берётся из одного значения.
export function BeforeAfter({ before, after }: BeforeAfterProps) {
  const [pos, setPos] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);
  const touched = useRef(false);

  // Когда шторка впервые попадает в кадр, она сама «проезжает» туда-обратно —
  // так сразу видно, что её можно двигать. Любое касание останавливает демо.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let raf = 0;
    const stops = [50, 18, 82, 50];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now() + 300;
        const segment = 900;
        const tick = (now: number) => {
          if (touched.current) return;
          const t = Math.max(0, now - start);
          const i = Math.min(stops.length - 2, Math.floor(t / segment));
          const local = Math.min(1, (t - i * segment) / segment);
          const eased =
            local < 0.5 ? 4 * local ** 3 : 1 - (-2 * local + 2) ** 3 / 2;
          setPos(stops[i] + (stops[i + 1] - stops[i]) * eased);
          if (t < segment * (stops.length - 1))
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.55 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <figure>
      <div
        ref={boxRef}
        onPointerDown={() => (touched.current = true)}
        className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-3xl bg-media shadow-lift focus-within:ring-2 focus-within:ring-canvas focus-within:ring-offset-4 focus-within:ring-offset-espresso"
      >
        <SkeletonImage
          src={before}
          alt="До примерки"
          sizes="(max-width: 1024px) 90vw, 32rem"
          className="object-top"
          placeholderClassName="bg-media"
        />

        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        >
          <SkeletonImage
            src={after}
            alt="После примерки"
            sizes="(max-width: 1024px) 90vw, 32rem"
            className="object-top"
            placeholderClassName="bg-media"
          />
        </div>

        <span className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-espresso/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-canvas backdrop-blur-sm">
          До
        </span>
        <span className="pointer-events-none absolute right-4 top-4 z-20 rounded-full bg-clay px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-canvas">
          После
        </span>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 bg-canvas/90"
          style={{ left: `${pos}%` }}
        >
          <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-canvas text-espresso shadow-lift">
            <MoveHorizontal className="size-5" strokeWidth={1.75} />
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(pos)}
          onChange={(e) => {
            touched.current = true;
            setPos(Number(e.target.value));
          }}
          onKeyDown={() => (touched.current = true)}
          aria-label="Сравнить фото до и после примерки"
          aria-valuetext={`Показано ${100 - Math.round(pos)}% результата`}
          className="slider-raw absolute inset-0 z-30 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0"
        />
      </div>
      <figcaption className="mt-4 text-center text-[13px] text-canvas-dim">
        Потяни разделитель и сравни
      </figcaption>
    </figure>
  );
}
