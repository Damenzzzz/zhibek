const STEPS = [
  {
    title: "Выбери образ",
    text: "Каталог собран образами целиком: берёшь верх, низ или комплект одним движением — вещи уже подобраны друг к другу на съёмке.",
    meta: "каталог",
  },
  {
    title: "Задай параметры",
    text: "Рост, вес, телосложение, возраст, тон кожи, размер и поза. Анкета заполняется один раз и живёт в браузере — регистрации нет.",
    meta: "анкета",
  },
  {
    title: "Примерь за секунды",
    text: "Нейросеть кладёт весь образ на твою фигуру за один проход и отдаёт кадр «до / после». Сравниваешь, скачиваешь, откладываешь в примерочную.",
    meta: "результат",
  },
];

// Светлая полоса-разворот между тёмными секциями: даёт странице ритм
// «журнальной» вёрстки и делает шаги перечнем, а не тремя одинаковыми
// карточками. Строка при наведении выворачивается в чёрный на всю ширину
// экрана — отсюда before-псевдоэлемент с выносом за поля контейнера.
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 overflow-hidden bg-canvas-2 py-24 text-ink sm:py-32"
    >
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-14">
        <div className="on-view flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="tag text-ink/50">как это работает</span>
            <h2 className="mt-5 font-editorial text-[clamp(2.25rem,6vw,4.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
              Три шага
              <br />
              до примерки
            </h2>
          </div>
          <p className="max-w-xs font-grotesk text-[13px] leading-relaxed text-ink/55">
            Ни очереди в кабинку, ни возвратов «не подошло». Всё, что нужно, —
            фотография или анкета.
          </p>
        </div>

        <div className="mt-16 border-b border-hair-ink">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="group relative cursor-default border-t border-hair-ink transition-colors duration-500"
            >
              <span className="pointer-events-none absolute inset-y-0 left-[-50vw] right-[-50vw] bg-espresso opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative z-10 grid items-baseline gap-x-8 gap-y-4 py-9 md:grid-cols-12 md:py-12">
                <span className="stroke-ink col-span-2 font-editorial text-[clamp(2.75rem,7vw,5.5rem)] leading-none">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-4">
                  <span className="font-grotesk text-[10px] uppercase tracking-[0.3em] text-clay">
                    {step.meta}
                  </span>
                  <h3 className="mt-2 font-editorial text-2xl uppercase leading-tight tracking-tight transition-colors duration-500 group-hover:text-canvas sm:text-3xl">
                    {step.title}
                  </h3>
                </div>
                <p className="col-span-5 col-start-8 font-grotesk text-sm leading-relaxed text-ink/60 transition-colors duration-500 group-hover:text-canvas/70">
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
