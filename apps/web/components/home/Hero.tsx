import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check } from "lucide-react";
import { SkeletonImage } from "@/components/SkeletonImage";

export function Hero() {
  return (
    <section className="overflow-hidden pt-24 sm:pt-28">
      <div className="site-container">
        <div className="mb-8 flex items-center justify-between border-b border-hair-ink pb-4 text-[10px] uppercase text-ink-soft sm:mb-10 sm:text-xs">
          <span>Одежда. Ты. Новые сочетания.</span>
          <span>Smart Fashion / Shymkent</span>
        </div>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="pb-2 lg:pb-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-clay/20 bg-clay/5 px-3 py-2 text-xs text-clay">
              <span className="size-1.5 rounded-full bg-clay" />
              Твоя виртуальная примерочная
            </span>
            <h1 className="mt-7 text-balance font-display text-[clamp(2.7rem,5.8vw,6rem)] leading-[1.05]">
              Найди образ.
              <br />
              <span className="text-clay">Узнай себя.</span>
            </h1>
            <p className="mt-7 max-w-md text-pretty text-base leading-relaxed text-ink-soft sm:text-lg">
              Вещи, которые хочется примерить. Теперь — на тебе. Выбирай готовые
              сочетания и смотри, как они выглядят на твоей модели.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/catalog?view=looks" className="button-primary">
                Найти свой образ <ArrowUpRight className="size-4" />
              </Link>
              <Link href="/tryon" className="button-secondary">
                Начать примерку
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
              {["Без регистрации", "Со своим фото или без него"].map((text) => (
                <span key={text} className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-clay" />
                  {text}
                </span>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl pb-7 pl-8 sm:pl-14 lg:max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center [writing-mode:vertical-rl] text-[10px] uppercase text-ink-soft">
              Smart Fashion EDIT — твой стиль начинается с тебя
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[42%] bg-canvas-2">
              <SkeletonImage
                src="/tryon-demo.png"
                alt="Модель в полном образе: жилет, блузка и классические брюки"
                priority
                sizes="(max-width: 1024px) 90vw, 45vw"
              />
              <div className="absolute bottom-5 left-20 right-3 sm:left-24 sm:right-5 flex items-center justify-between gap-3 border border-white/70 bg-canvas/95 px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase text-ink-soft">
                    Один образ. Все детали.
                  </p>
                  <p className="mt-1 font-display text-lg">
                    Образ на тебе
                  </p>
                </div>
                <Link
                  href="/tryon"
                  aria-label="Открыть виртуальную примерочную"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-canvas hover:bg-clay"
                >
                  <ArrowUpRight className="size-5" />
                </Link>
              </div>
            </div>
            <div className="absolute -bottom-1 left-2 w-24 border-4 border-canvas bg-canvas-2 shadow-sm sm:w-32">
              <div className="relative aspect-[3/4]">
                <SkeletonImage
                  src="/hero-model.png"
                  alt="Исходная модель до примерки"
                  sizes="130px"
                  priority
                />
              </div>
              <p className="bg-canvas px-1 py-2 text-center text-[9px] uppercase text-ink-soft">
                До примерки
              </p>
            </div>
            <p className="mt-3 text-right text-[10px] text-ink-soft">
              Демонстрация виртуальной примерки · AI
            </p>
          </div>
        </div>
        <div className="mt-10 grid gap-4 border-t border-hair-ink py-7 text-xs text-ink-soft sm:grid-cols-3 sm:gap-8 lg:mt-14">
          <p>
            <span className="mr-3 font-display text-lg text-clay">01</span>
            Выбери вещи или готовый комплект
          </p>
          <p>
            <span className="mr-3 font-display text-lg text-clay">02</span>
            Добавь фото или создай свою модель
          </p>
          <p>
            <span className="mr-3 font-display text-lg text-clay">03</span>
            Примерь, сравни и сохрани
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 border-y border-hair-ink bg-canvas-2/50 py-4 text-xs text-ink-soft">
        <ArrowDown className="size-3.5" />
        Меньше сомнений. Больше твоего стиля.
      </div>
    </section>
  );
}
