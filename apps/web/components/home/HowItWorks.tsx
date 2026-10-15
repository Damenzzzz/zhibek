import { Camera, Layers, ScanLine } from "lucide-react";
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
    <section
      id="how-it-works"
      className="section-space scroll-mt-24 border-y border-hair-ink bg-canvas-2/40"
    >
      <div className="site-container">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="tag text-ink-soft">Всё проще, чем кажется</span>
            <h2 className="section-title mt-5">Три шага к своему образу</h2>
          </div>
          <p className="max-w-xs text-pretty text-sm leading-relaxed text-ink-soft">
            Без кабинок и регистрации. Только ты, одежда и немного технологий.
          </p>
        </div>
        <div className="mt-10 grid gap-7 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text, label }, i) => (
            <article key={title} className="border-t border-hair-ink pt-6">
              <div className="flex items-center justify-between">
                <Icon strokeWidth={1.4} className="size-7 text-clay" />
                <span className="text-xs tabular-nums text-ink-soft">
                  0{i + 1} / {label}
                </span>
              </div>
              <h3 className="mt-6 text-balance font-display text-xl lg:text-2xl">
                {title}
              </h3>
              <p className="mt-3 max-w-sm text-pretty text-sm leading-relaxed text-ink-soft">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
