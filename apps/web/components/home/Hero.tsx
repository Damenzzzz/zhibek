import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { SkeletonImage } from "@/components/SkeletonImage";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-20">
      {/* Декоративные пятна на фоне — лёгкий акцент без "молочного" узора */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-accent-soft blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-paper-soft blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8 lg:py-0">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-medium text-ink-soft">
            <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            Примерка на базе AI за секунды
          </span>

          <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]">
            Примерь образ,
            <br />
            прежде чем купить
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            ZHIBEK собирает каталог из реальных фотосессий и накладывает вещи на твою
            фигуру через нейросеть FASHN — верх, низ или целый образ, за одну примерку.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/catalog"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Смотреть каталог
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
            <Link
              href="/tryon"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:border-ink/40"
            >
              Начать примерку
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-6 text-sm text-ink-soft">
            <div>
              <p className="font-display text-2xl font-semibold text-ink">5–20с</p>
              <p className="mt-0.5">на одну примерку</p>
            </div>
            <div className="h-8 w-px bg-line" />
            <div>
              <p className="font-display text-2xl font-semibold text-ink">100%</p>
              <p className="mt-0.5">без похода в шоурум</p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2rem] border border-line bg-paper-soft shadow-[0_40px_80px_-30px_rgba(10,10,10,0.25)]">
            <SkeletonImage src="/hero-model.png" alt="Модель для примерки ZHIBEK" priority sizes="(max-width: 1024px) 90vw, 40vw" />
          </div>
          <div className="absolute -left-4 bottom-6 flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:-left-8">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="text-left">
              <p className="text-xs font-semibold text-ink">Модель сгенерирована AI</p>
              <p className="text-[11px] text-ink-soft">Без фото? Не проблема</p>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="#how-it-works"
        aria-label="Пролистать вниз"
        className="mx-auto mb-8 hidden h-10 w-10 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink/40 hover:text-ink sm:flex"
      >
        <ChevronDown className="h-5 w-5 animate-bounce" strokeWidth={1.75} />
      </Link>
    </section>
  );
}
