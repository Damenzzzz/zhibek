import Link from "next/link";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { SkeletonImage } from "@/components/SkeletonImage";
import { Tilt } from "@/components/Tilt";

const promises = [
  "Без регистрации",
  "Со своим фото или без него",
  "Весь образ за одну примерку",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-14 pt-28 sm:pb-20 sm:pt-32 lg:pb-24">
      {/* Мягкое терракотовое пятно за фото — тепло без лишней графики */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-10 h-[38rem] w-[38rem] rounded-full bg-clay-soft/70 blur-3xl"
      />
      <div className="site-container relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="max-w-2xl">
          <span
            className="reveal inline-flex items-center gap-2 rounded-full border border-clay/20 bg-surface/70 px-3.5 py-2 text-[13px] text-clay"
            style={{ "--d": 0 } as React.CSSProperties}
          >
            <Sparkles className="size-3.5" strokeWidth={1.75} />
            Виртуальная примерочная с AI
          </span>
          <h1
            className="reveal mt-7 font-display text-[clamp(2.75rem,6.2vw,5.6rem)] leading-[1.02] tracking-[-0.02em]"
            style={{ "--d": 80 } as React.CSSProperties}
          >
            Найди образ.
            <br />
            <span className="headline-accent">Узнай себя.</span>
          </h1>
          <p
            className="lead reveal mt-7 max-w-[30rem]"
            style={{ "--d": 160 } as React.CSSProperties}
          >
            Вещи, которые хочется примерить, — теперь на тебе. Выбирай готовые
            сочетания и смотри, как они выглядят на твоей модели.
          </p>
          <div
            id="hero-cta"
            className="reveal mt-9 flex flex-wrap gap-3"
            style={{ "--d": 240 } as React.CSSProperties}
          >
            <Link
              href="/catalog?view=looks"
              className="button-primary button-lg"
            >
              Найти свой образ <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/tryon" className="button-secondary button-lg">
              Начать примерку
            </Link>
          </div>
          <ul
            className="reveal mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-soft"
            style={{ "--d": 320 } as React.CSSProperties}
          >
            {promises.map((text) => (
              <li key={text} className="inline-flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-clay/10">
                  <Check className="size-3 text-clay" strokeWidth={2.5} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="reveal relative mx-auto w-full max-w-[26rem] sm:max-w-md lg:mr-0"
          style={{ "--d": 200 } as React.CSSProperties}
        >
          {/* Арка — «после»: модель уже в образе. Наклоняется за курсором,
              по фото бежит линия «сканирования» нейросети. */}
          <Tilt max={5} className="rounded-t-[999px] rounded-b-3xl">
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-3xl bg-media shadow-lift ring-1 ring-hair-ink">
              <SkeletonImage
                src="/hero-after.webp"
                alt="Модель в полном образе: жилет, блузка и классические брюки"
                priority
                sizes="(max-width: 1024px) 90vw, 32rem"
                className="object-top"
              />
              <span aria-hidden className="scan-line" />
              <span className="absolute right-4 top-[22%] inline-flex items-center gap-1.5 rounded-full bg-clay px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-canvas">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-canvas/80" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-canvas" />
                </span>
                После
              </span>
            </div>
          </Tilt>

          {/* Полароид — «до»: исходное фото */}
          <figure className="float-soft absolute -left-4 bottom-16 z-20 w-[34%] -rotate-[5deg] rounded-xl bg-surface p-1.5 pb-0 shadow-lift sm:-left-10">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-media">
              <SkeletonImage
                src="/hero-before.webp"
                alt="Исходное фото модели до примерки"
                sizes="160px"
                priority
                className="object-top"
              />
            </div>
            <figcaption className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
              До
            </figcaption>
          </figure>

          {/* Подпись к примеру */}
          <div className="absolute -bottom-5 right-3 z-20 flex items-center gap-4 rounded-2xl border border-hair-ink bg-surface/95 py-3 pl-4 pr-3 shadow-soft backdrop-blur sm:-right-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                Один образ · 5 вещей
              </p>
              <p className="mt-1 font-display text-lg leading-tight">
                Образ на тебе
              </p>
            </div>
            <Link
              href="/tryon"
              aria-label="Открыть виртуальную примерочную"
              className="group flex size-11 shrink-0 items-center justify-center rounded-full bg-espresso text-canvas transition-colors duration-200 hover:bg-clay"
            >
              <ArrowUpRight className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
