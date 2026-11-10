"use client";

import { useState } from "react";
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

  return (
    <figure>
      <div className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-3xl bg-media shadow-lift focus-within:ring-2 focus-within:ring-canvas focus-within:ring-offset-4 focus-within:ring-offset-espresso">
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
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Сравнить фото до и после примерки"
          aria-valuetext={`Показано ${100 - pos}% результата`}
          className="slider-raw absolute inset-0 z-30 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0"
        />
      </div>
      <figcaption className="mt-4 text-center text-[13px] text-canvas-dim">
        Потяни разделитель и сравни
      </figcaption>
    </figure>
  );
}
