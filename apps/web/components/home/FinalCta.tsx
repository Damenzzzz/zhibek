import Link from "next/link";

// Финальный разворот — сплошная терракота во всю ширину: единственная плашка
// чистого цвета на странице, поэтому она и работает точкой выхода.
export function FinalCta() {
  return (
    <section className="grain relative overflow-hidden bg-clay py-24 text-canvas sm:py-32">
      <div className="relative z-10 mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-14">
        <div className="on-view grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <span className="tag text-canvas/70 before:bg-canvas">пора</span>
            <h2 className="mt-5 font-display text-[clamp(2.5rem,8vw,7rem)] uppercase leading-[0.85] tracking-[-0.025em]">
              Хватит
              <br />
              <span className="stroke-canvas">гадать,</span>
              <br />
              подойдёт&nbsp;ли
            </h2>
          </div>

          <div className="lg:pb-4">
            <p className="max-w-sm font-grotesk text-[15px] leading-relaxed text-canvas/80">
              Анкета заполняется один раз и остаётся в браузере. Дальше любой образ
              из каталога примеряется в два клика.
            </p>

            <div className="mt-9 flex flex-wrap items-stretch gap-3">
              <Link
                href="/profile"
                className="group relative inline-flex items-center bg-canvas px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-ink"
              >
                <span className="pointer-events-none absolute inset-0 translate-x-1.5 translate-y-1.5 border border-canvas transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
                заполнить анкету
              </Link>
              <Link
                href="/catalog"
                className="inline-flex items-center border border-canvas/40 px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-canvas transition-colors duration-300 hover:border-canvas"
              >
                сначала каталог
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
