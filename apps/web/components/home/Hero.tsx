import Link from "next/link";
import { SkeletonImage } from "@/components/SkeletonImage";

// Строки бегущей ленты внизу экрана. Дублируются в разметке ×2 — так
// @keyframes marquee (сдвиг на -50%) замыкается без стыка.
const TICKER = [
  "silk — шёлк",
  "виртуальная примерочная",
  "верх · низ · образ целиком",
  "без похода в шоурум",
  "примерка",
];

const STATS = [
  { value: "1", unit: "проход", note: "весь образ целиком" },
  { value: "01", unit: "анкета", note: "и весь каталог твой" },
  { value: "00", unit: "шоурумов", note: "ехать никуда не надо" },
];

export function Hero() {
  return (
    <section className="grain relative flex min-h-screen flex-col overflow-hidden bg-canvas text-ink">
      <div className="warp-lines pointer-events-none absolute inset-0 opacity-50" />
      {/* Тёплое пятно шафрана в углу — воздух за фотографией, а не градиент-обои */}
      <div className="pointer-events-none absolute -right-40 top-0 h-[38rem] w-[38rem] rounded-full bg-saffron/20 blur-3xl" />

      <div className="pointer-events-none absolute left-6 top-1/2 z-10 hidden -translate-y-1/2 xl:block">
        <span className="flex items-center gap-4 font-grotesk text-[10px] uppercase tracking-[0.4em] text-ink-soft [writing-mode:vertical-rl]">
          <span className="h-1.5 w-1.5 rounded-full bg-clay" />
          Shymkent · выпуск 01
        </span>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[88rem] flex-1 items-center gap-12 px-5 pb-24 pt-32 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-14 lg:pb-20">
        <div>
          <span className="tag reveal-soft text-ink-soft" style={{ "--d": 80 } as React.CSSProperties}>
            примерка
          </span>

          {/* Каждая строка — своя маска overflow-hidden, чтобы текст выезжал
              из-под края, а не просто проявлялся. */}
          <h1 className="mt-6 font-display uppercase leading-[0.86] tracking-[-0.02em] text-[clamp(2.75rem,7vw,6.5rem)]">
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="reveal-line" style={{ "--d": 120 } as React.CSSProperties}>
                Примерь
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <span
                className="reveal-line stroke-clay pl-[0.1em]"
                style={{ "--d": 240 } as React.CSSProperties}
              >
                образ
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="reveal-line" style={{ "--d": 360 } as React.CSSProperties}>
                до&nbsp;покупки
              </span>
            </span>
          </h1>

          <div className="reveal-soft mt-8 max-w-md" style={{ "--d": 520 } as React.CSSProperties}>
            <p className="font-grotesk text-[15px] leading-relaxed text-ink-soft sm:text-base">
              Каталог собран из живых съёмок, а не с фотостоков. Нейросеть кладёт
              на твою фигуру верх, низ или образ целиком за одну примерку.
            </p>

            <div className="mt-8 flex flex-wrap items-stretch gap-3">
              {/* Прямоугольник со смещённой рамкой вместо капсулы — рамка
                  догоняет кнопку по наведению. */}
              <Link
                href="/catalog"
                className="group relative inline-flex items-center bg-clay px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-canvas"
              >
                <span className="pointer-events-none absolute inset-0 translate-x-1.5 translate-y-1.5 border border-clay transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
                смотреть каталог
              </Link>
              <Link
                href="/tryon"
                className="inline-flex items-center border border-hair-ink px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-ink transition-colors duration-300 hover:border-ink"
              >
                начать примерку
              </Link>
            </div>
          </div>

          <dl
            className="reveal-soft mt-12 grid max-w-2xl grid-cols-3 border-t border-hair-ink pt-6"
            style={{ "--d": 660 } as React.CSSProperties}
          >
            {STATS.map((s) => (
              <div key={s.note} className="pr-4">
                <dt className="font-display text-3xl leading-none sm:text-4xl">
                  {s.value}
                  <span className="ml-1.5 font-grotesk text-[10px] uppercase tracking-[0.2em] text-clay">
                    {s.unit}
                  </span>
                </dt>
                <dd className="mt-2 font-grotesk text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                  {s.note}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Фото в своей колонке: подложка из шалфея сдвинута — слоёная
            журнальная врезка вместо тени. Заголовок на фото больше не заходит. */}
        <div
          className="reveal-soft relative mx-auto w-full max-w-sm lg:max-w-none"
          style={{ "--d": 460 } as React.CSSProperties}
        >
          <span className="pointer-events-none absolute -left-4 -top-4 hidden h-full w-full border border-sage/50 sm:block" />
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-canvas-2">
            <SkeletonImage
              src="/hero-model.png"
              alt="Модель для примерки SILK"
              priority
              sizes="(max-width: 1024px) 80vw, 40vw"
              placeholderClassName="bg-canvas-2"
            />
          </div>
          <p className="mt-3 flex items-center justify-between font-grotesk text-[10px] uppercase tracking-[0.28em] text-ink-soft">
            <span>модель сгенерирована ai</span>
            <span className="text-clay">01</span>
          </p>
        </div>
      </div>

      <div className="relative z-10 overflow-hidden border-y border-clay/30 bg-clay py-3">
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex shrink-0">
              {TICKER.map((word) => (
                <span
                  key={word}
                  className="flex items-center gap-8 whitespace-nowrap px-8 font-grotesk text-[11px] uppercase tracking-[0.3em] text-canvas"
                >
                  {word}
                  <span className="h-1 w-1 rounded-full bg-canvas/60" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
