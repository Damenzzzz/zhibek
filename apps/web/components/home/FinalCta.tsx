import Link from "next/link";

// Финальный разворот — светлая плашка на всю ширину, чтобы страница
// закрывалась вспышкой после тёмных секций и упиралась в тёмный подвал.
export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-silk py-24 text-noir sm:py-32">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-14">
        <div className="on-view grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <span className="tag text-noir/50">пора</span>
            <h2 className="mt-5 font-editorial text-[clamp(2.5rem,8vw,7rem)] uppercase leading-[0.85] tracking-[-0.025em]">
              Хватит
              <br />
              <span className="stroke-noir">гадать,</span>
              <br />
              подойдёт&nbsp;ли
            </h2>
          </div>

          <div className="lg:pb-4">
            <p className="max-w-sm font-grotesk text-[15px] leading-relaxed text-noir/60">
              Анкета заполняется один раз и остаётся в браузере. Дальше любой образ
              из каталога примеряется в два клика.
            </p>

            <div className="mt-9 flex flex-wrap items-stretch gap-3">
              <Link
                href="/profile"
                className="group relative inline-flex items-center bg-madder px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-silk"
              >
                <span className="pointer-events-none absolute inset-0 translate-x-1.5 translate-y-1.5 border border-madder transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
                заполнить анкету
              </Link>
              <Link
                href="/catalog"
                className="inline-flex items-center border border-hair-ink px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-noir transition-colors duration-300 hover:border-noir"
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
