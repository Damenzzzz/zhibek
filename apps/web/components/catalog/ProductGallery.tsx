"use client";

import { useEffect, useState } from "react";

// Галерея фото товара со стрелками и превью. Для товаров из папок data/raw
// это несколько ракурсов, для кропов с коллажа — одно фото (стрелки/превью
// тогда не показываются). Сама картинка мягко проявляется при переключении.
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const count = images.length;
  const hasMultiple = count > 1;

  const go = (next: number) => {
    setLoaded(false);
    setIndex(((next % count) + count) % count);
  };

  // Листание стрелками клавиатуры, когда фокус в пределах страницы товара.
  useEffect(() => {
    if (!hasMultiple) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasMultiple]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3">
      <div className="group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-line bg-paper-soft">
        <div
          aria-hidden
          className={
            "absolute inset-0 bg-bone-soft transition-opacity duration-500 " +
            (loaded ? "opacity-0" : "animate-pulse opacity-100")
          }
        />
        {/* key меняется при переключении — картинка перемонтируется и заново
            проигрывает fade-in анимацию. eslint-disable для нативного img:
            источники внешние (Vercel Blob/статик), next/image здесь не нужен. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={index}
          src={images[index]}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={
            "h-full w-full object-cover transition-all duration-500 " +
            (loaded ? "animate-fade-in-scale opacity-100" : "opacity-0")
          }
        />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Предыдущее фото"
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/85 text-ink shadow-sm backdrop-blur transition-all hover:scale-105 hover:bg-white active:scale-95"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Следующее фото"
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/85 text-ink shadow-sm backdrop-blur transition-all hover:scale-105 hover:bg-white active:scale-95"
            >
              <ChevronRight />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-ink/75 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Фото ${i + 1}`}
              className={
                "relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all sm:w-20 " +
                (i === index ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
