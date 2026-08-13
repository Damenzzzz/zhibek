"use client";

import { useState } from "react";
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
  const [pos, setPos] = useState(52);

  return (
    <div className="relative aspect-[3/4] w-full select-none overflow-hidden bg-noir-raised">
      <SkeletonImage
        src={before}
        alt="До примерки"
        sizes="(max-width: 1024px) 90vw, 42vw"
        className="object-top"
        placeholderClassName="bg-noir-raised"
      />

      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <SkeletonImage
          src={after}
          alt="После примерки"
          sizes="(max-width: 1024px) 90vw, 42vw"
          className="object-top"
          placeholderClassName="bg-noir-raised"
        />
      </div>

      <span className="pointer-events-none absolute left-4 top-4 z-20 bg-noir/80 px-3 py-1.5 font-grotesk text-[9px] uppercase tracking-[0.3em] text-silk-dim backdrop-blur-sm">
        до
      </span>
      <span className="pointer-events-none absolute right-4 top-4 z-20 bg-madder px-3 py-1.5 font-grotesk text-[9px] uppercase tracking-[0.3em] text-silk">
        после
      </span>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 z-20 w-px bg-silk"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-madder">
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-silk" fill="none" strokeWidth={1.75}>
            <path d="M9 6 4 12l5 6M15 6l5 6-5 6" strokeLinecap="square" />
          </svg>
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Сравнить фото до и после примерки"
        className="slider-raw absolute inset-0 z-30 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0"
      />

      <span className="pointer-events-none absolute inset-0 z-10 ring-1 ring-inset ring-hair" />
    </div>
  );
}
