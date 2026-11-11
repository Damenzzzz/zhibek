"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Плавающая кнопка «Примерить» на телефоне: появляется, когда кнопки первого
// экрана ушли из кадра, и прячется у финального блока, где свои кнопки.
// Так главное действие всегда под большим пальцем, но не дублируется.
export function MobileStickyCta() {
  const [heroVisible, setHeroVisible] = useState(true);
  const [finalVisible, setFinalVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const final = document.getElementById("final-cta");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) setHeroVisible(entry.isIntersecting);
        if (entry.target === final) setFinalVisible(entry.isIntersecting);
      }
    });
    if (hero) observer.observe(hero);
    if (final) observer.observe(final);
    return () => observer.disconnect();
  }, []);

  const shown = !heroVisible && !finalVisible;

  return (
    <div
      aria-hidden={!shown}
      className={cn(
        "fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 transition-[transform,opacity] duration-300 ease-out lg:hidden",
        shown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-[140%] opacity-0",
      )}
    >
      <div className="flex items-center gap-2 rounded-full border border-hair bg-espresso/95 p-1.5 pl-5 text-canvas shadow-lift backdrop-blur-md">
        <p className="min-w-0 flex-1 truncate text-sm text-canvas-dim">
          Примерь образ на себе
        </p>
        <Link
          href="/tryon"
          tabIndex={shown ? undefined : -1}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-clay px-5 text-sm font-medium text-canvas transition-colors active:bg-clay-deep"
        >
          <Sparkles className="size-4" strokeWidth={1.75} />
          Примерить
        </Link>
      </div>
    </div>
  );
}
