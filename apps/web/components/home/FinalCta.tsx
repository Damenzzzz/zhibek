import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SkeletonImage } from "@/components/SkeletonImage";
import type { CatalogLook } from "@/lib/catalogView";

// Финальный призыв: тёмная карточка-врезка на светлом фоне (так она не
// сливается с тёмным подвалом), справа — веер из настоящих образов коллекции.
// При наведении на блок веер раскрывается, каждая карточка ведёт в примерку.
const fan = [
  {
    // левая, позади
    base: "left-[2%] top-[10%] z-10 -rotate-[9deg]",
    open: "group-hover/cta:-translate-x-6 group-hover/cta:-rotate-[14deg]",
    delay: "0s",
  },
  {
    // центральная, впереди
    base: "left-1/2 top-0 z-20 -translate-x-1/2",
    open: "group-hover/cta:-translate-y-3",
    delay: "-2s",
  },
  {
    // правая, позади
    base: "right-[2%] top-[10%] z-10 rotate-[9deg]",
    open: "group-hover/cta:translate-x-6 group-hover/cta:rotate-[14deg]",
    delay: "-4s",
  },
];

export function FinalCta({
  looks,
  itemCount,
}: {
  looks: CatalogLook[];
  itemCount: number;
}) {
  const picks = looks.slice(0, 3);
  return (
    <section id="final-cta" className="bg-canvas py-16 sm:py-24">
      <div className="site-container">
        <div className="group/cta relative overflow-hidden rounded-[2rem] bg-espresso px-6 py-14 text-canvas shadow-lift sm:px-12 sm:py-16 lg:px-16 lg:py-20">
          {/* Мягкое свечение вместо плоской заливки */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-clay/35 blur-[120px] transition-transform duration-700 group-hover/cta:scale-110"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-40 left-1/4 h-[22rem] w-[22rem] rounded-full bg-saffron/15 blur-[110px]"
          />

          <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="label text-saffron">
                Следующий образ — уже где-то здесь
              </p>
              <h2 className="mt-6 max-w-xl text-balance font-display text-[clamp(2.2rem,4.6vw,3.9rem)] leading-[1.06] tracking-[-0.01em]">
                Дай себе <span className="text-saffron">примерить новое.</span>
              </h2>
              <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-canvas-dim sm:text-lg">
                {looks.length} готовых образов и {itemCount} вещей ждут
                примерки. Без регистрации — со своим фото или моделью по анкете.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/tryon" className="button-light button-lg">
                  Начать примерку <ArrowUpRight className="size-4" />
                </Link>
                <Link
                  href="/catalog?view=looks"
                  className="button-ghost-light button-lg"
                >
                  Открыть коллекцию
                </Link>
              </div>
            </div>

            {picks.length > 0 && (
              <div className="relative mx-auto h-[19rem] w-full max-w-md sm:h-[24rem]">
                {picks.map((look, i) => {
                  const pos = fan[picks.length === 1 ? 1 : i] ?? fan[1];
                  return (
                    <Link
                      key={look.id}
                      href={`/tryon?look=${encodeURIComponent(look.id)}`}
                      aria-label={`Примерить: ${look.title}`}
                      className={`group/look absolute w-[46%] transition-transform duration-500 ease-out ${pos.base} ${pos.open} hover:z-30`}
                    >
                      <div
                        className="float-soft"
                        style={{ animationDelay: pos.delay }}
                      >
                        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-media shadow-lift ring-1 ring-hair transition-transform duration-300 group-hover/look:scale-[1.04]">
                          <SkeletonImage
                            src={look.cover}
                            fallbackSrc={look.fallback}
                            alt={look.title}
                            sizes="(max-width:1024px) 45vw, 18rem"
                            className="scale-[1.04] object-[50%_30%]"
                          />
                          <span className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-xl bg-espresso/70 px-3 py-2 text-[13px] text-canvas opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover/look:opacity-100 group-focus-visible/look:opacity-100">
                            <span className="truncate">{look.title}</span>
                            <ArrowUpRight className="size-4 shrink-0 text-saffron" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
