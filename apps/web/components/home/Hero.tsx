import Link from "next/link";
import { SkeletonImage } from "@/components/SkeletonImage";

// Строки бегущей ленты внизу экрана. Дублируются в разметке ×2 — так
// @keyframes marquee (сдвиг на -50%) замыкается без стыка.
const TICKER = [
  "жібек — шёлк",
  "виртуальная примерочная",
  "верх · низ · образ целиком",
  "без похода в шоурум",
  "fashn ai",
];

const STATS = [
  { value: "5–20", unit: "сек", note: "одна примерка" },
  { value: "01", unit: "анкета", note: "и весь каталог твой" },
  { value: "00", unit: "шоурумов", note: "ехать никуда не надо" },
];

export function Hero() {
  return (
    <section className="grain relative flex min-h-screen flex-col overflow-hidden bg-noir text-silk">
      <div className="warp-lines pointer-events-none absolute inset-0 opacity-60" />

      {/* Боковая колонтитульная полоса — вертикальный набор вдоль левого поля */}
      <div className="pointer-events-none absolute left-6 top-1/2 z-10 hidden -translate-y-1/2 xl:block">
        <span className="flex items-center gap-4 font-grotesk text-[10px] uppercase tracking-[0.4em] text-silk-dim [writing-mode:vertical-rl]">
          <span className="h-1.5 w-1.5 rounded-full bg-madder" />
          Almaty · выпуск 01
        </span>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[88rem] flex-1 flex-col px-5 pb-28 pt-32 sm:px-8 lg:px-14 lg:pt-36">
        <span className="tag reveal-soft text-silk-dim" style={{ "--d": 80 } as React.CSSProperties}>
          примерка на нейросети
        </span>

        {/* Каждая строка — своя маска overflow-hidden, чтобы текст выезжал
            из-под края, а не просто проявлялся. */}
        <h1 className="mt-7 font-editorial uppercase leading-[0.84] tracking-[-0.02em] text-[clamp(3rem,10.5vw,9.5rem)]">
          <span className="block overflow-hidden pb-[0.06em]">
            <span className="reveal-line" style={{ "--d": 120 } as React.CSSProperties}>
              Примерь
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.06em]">
            <span
              className="reveal-line stroke-silk pl-[0.12em]"
              style={{ "--d": 240 } as React.CSSProperties}
            >
              образ
            </span>
          </span>
          {/* Третья строка сидит поверх фото — на ней и держится наложение */}
          <span className="relative z-30 block overflow-hidden pb-[0.06em]">
            <span className="reveal-line" style={{ "--d": 360 } as React.CSSProperties}>
              до&nbsp;покупки
            </span>
          </span>
        </h1>

        {/* Фото врезано в правое поле и уходит под заголовок; на мобильном
            становится обычным блоком в потоке. */}
        <div
          className="reveal-soft relative z-20 mx-auto mt-10 w-full max-w-[17rem] lg:absolute lg:right-10 lg:top-32 lg:mt-0 lg:w-[30vw] lg:max-w-[26rem] xl:right-20"
          style={{ "--d": 520 } as React.CSSProperties}
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-noir-raised">
            <SkeletonImage
              src="/hero-model.png"
              alt="Модель для примерки ZHIBEK"
              priority
              sizes="(max-width: 1024px) 70vw, 30vw"
              placeholderClassName="bg-noir-raised"
            />
            <span className="absolute inset-0 ring-1 ring-inset ring-hair" />
          </div>
          <p className="mt-3 flex items-center justify-between font-grotesk text-[10px] uppercase tracking-[0.28em] text-silk-dim">
            <span>модель сгенерирована ai</span>
            <span className="text-madder">01</span>
          </p>
        </div>

        <div
          className="reveal-soft relative z-30 mt-10 max-w-md lg:mt-14"
          style={{ "--d": 620 } as React.CSSProperties}
        >
          <p className="font-grotesk text-[15px] leading-relaxed text-silk-dim sm:text-base">
            Каталог собран из живых съёмок, а не с фотостоков. Нейросеть FASHN кладёт вещь
            на твою фигуру — верх, низ или образ целиком за одну примерку.
          </p>

          <div className="mt-8 flex flex-wrap items-stretch gap-3">
            {/* Прямоугольник со смещённой рамкой вместо капсулы — рамка
                догоняет кнопку по наведению. */}
            <Link
              href="/catalog"
              className="group relative inline-flex items-center bg-madder px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-silk"
            >
              <span className="pointer-events-none absolute inset-0 translate-x-1.5 translate-y-1.5 border border-madder transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
              смотреть каталог
            </Link>
            <Link
              href="/tryon"
              className="inline-flex items-center border border-hair px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-silk transition-colors duration-300 hover:border-silk"
            >
              начать примерку
            </Link>
          </div>
        </div>

        <dl
          className="reveal-soft relative z-30 mt-14 grid max-w-2xl grid-cols-3 gap-px border-t border-hair pt-6 lg:mt-auto"
          style={{ "--d": 760 } as React.CSSProperties}
        >
          {STATS.map((s) => (
            <div key={s.note} className="pr-4">
              <dt className="font-editorial text-3xl leading-none sm:text-4xl">
                {s.value}
                <span className="ml-1.5 font-grotesk text-[10px] uppercase tracking-[0.2em] text-madder">
                  {s.unit}
                </span>
              </dt>
              <dd className="mt-2 font-grotesk text-[11px] uppercase tracking-[0.16em] text-silk-dim">
                {s.note}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative z-10 overflow-hidden border-y border-hair bg-madder py-3">
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex shrink-0">
              {TICKER.map((word) => (
                <span
                  key={word}
                  className="flex items-center gap-8 whitespace-nowrap px-8 font-grotesk text-[11px] uppercase tracking-[0.3em] text-silk"
                >
                  {word}
                  <span className="h-1 w-1 rounded-full bg-silk/60" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
