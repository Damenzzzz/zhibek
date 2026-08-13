import Link from "next/link";
import { BeforeAfter } from "@/components/home/BeforeAfter";

const NOTES = [
  ["01", "История сохраняется — вернуться и пересмотреть можно в любой момент."],
  ["02", "Нет своего фото — модель соберётся по анкете: рост, фигура, поза."],
  ["03", "Понравилось — образ уходит в примерочную, оттуда к покупке."],
];

export function TryonShowcase() {
  return (
    <section className="relative overflow-hidden bg-canvas-2 py-24 text-ink sm:py-32">
      <div className="mx-auto grid max-w-[88rem] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:gap-20 lg:px-14">
        <div className="on-view order-2 lg:order-1">
          <span className="tag text-ink-soft">результат</span>
          <h2 className="mt-5 font-display text-[clamp(2.25rem,6vw,4.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
            Потяни
            <br />
            и&nbsp;<span className="stroke-clay">сравни</span>
          </h2>
          <p className="mt-6 max-w-md font-grotesk text-[15px] leading-relaxed text-ink-soft">
            Слева — исходный кадр, справа — та же фигура после примерки. Шторка
            двигается мышью, пальцем и стрелками с клавиатуры.
          </p>

          <dl className="mt-10 max-w-md border-t border-hair-ink">
            {NOTES.map(([num, text]) => (
              <div key={num} className="flex gap-6 border-b border-hair-ink py-4">
                <dt className="font-display text-sm text-clay">{num}</dt>
                <dd className="font-grotesk text-[13px] leading-relaxed text-ink-soft">{text}</dd>
              </div>
            ))}
          </dl>

          <Link
            href="/tryon"
            className="group relative mt-10 inline-flex items-center bg-espresso px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-canvas"
          >
            <span className="pointer-events-none absolute inset-0 translate-x-1.5 translate-y-1.5 border border-espresso transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
            попробовать примерку
          </Link>
        </div>

        <div className="on-view order-1 mx-auto w-full max-w-sm lg:order-2 lg:max-w-none">
          <BeforeAfter before="/hero-model.png" after="/tryon-demo.png" />
          <p className="mt-3 text-center font-grotesk text-[10px] uppercase tracking-[0.3em] text-ink-soft">
            fashn · одна примерка
          </p>
        </div>
      </div>
    </section>
  );
}
