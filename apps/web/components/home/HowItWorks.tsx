import Link from "next/link";
import { ArrowUpRight, Camera, Layers, ScanLine } from "lucide-react";

const steps = [
  {
    icon: Layers,
    title: "Вдохновись сочетанием",
    text: "Бери готовый комплект или собирай свой: верх, низ, обувь, сумку и второй слой.",
    label: "Выбрать",
  },
  {
    icon: Camera,
    title: "Добавь немного себя",
    text: "Используй фото в полный рост. Нет подходящего? Создай модель по своей анкете.",
    label: "Настроить",
  },
  {
    icon: ScanLine,
    title: "Посмотри по-новому",
    text: "Сравни результат с исходным фото. Сохрани изображение или вернись к нему в истории.",
    label: "Примерить",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-space bg-canvas-2/45">
      <div className="site-container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="label text-clay">Всё проще, чем кажется</span>
            <h2 className="section-title mt-5">
              Три шага <span className="accent-italic">к своему образу</span>
            </h2>
          </div>
          <p className="max-w-xs text-pretty text-[15px] leading-relaxed text-ink-soft">
            Без кабинок и регистрации. Только ты, одежда и немного технологий.
          </p>
        </div>
        <ol className="relative mt-14 grid gap-5 md:grid-cols-3">
          {/* Нить, соединяющая шаги на десктопе */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-[16%] right-[16%] top-[3.25rem] hidden border-t border-dashed border-clay/35 md:block"
          />
          {steps.map(({ icon: Icon, title, text, label }, i) => (
            <li
              key={title}
              className="on-view panel relative flex flex-col p-7 shadow-soft sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="relative flex size-12 items-center justify-center rounded-full bg-clay text-canvas">
                  <Icon strokeWidth={1.5} className="size-5" />
                </span>
                <span className="font-display text-5xl italic leading-none text-clay/25">
                  0{i + 1}
                </span>
              </div>
              <span className="label mt-8 text-ink-soft">{label}</span>
              <h3 className="mt-3 font-display text-2xl leading-snug">
                {title}
              </h3>
              <p className="mt-3 text-pretty text-[15px] leading-relaxed text-ink-soft">
                {text}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex justify-center">
          <Link href="/tryon" className="button-dark">
            Начать с первого шага <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
