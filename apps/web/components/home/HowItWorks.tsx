import { Shirt, SlidersHorizontal, Wand2 } from "lucide-react";

const STEPS = [
  {
    icon: Shirt,
    title: "Выбери образ",
    text: "Пролистай каталог — вещи собраны в готовые образы, можно взять верх, низ или всё сразу.",
  },
  {
    icon: SlidersHorizontal,
    title: "Задай параметры",
    text: "Рост, вес, телосложение, возраст, тон кожи, размер и поза — чем точнее анкета, тем точнее модель.",
  },
  {
    icon: Wand2,
    title: "Примерь за секунды",
    text: "FASHN накладывает вещь на фигуру и присылает результат «До / После» — сравнивай и скачивай.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-line bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl">
          <span className="eyebrow">Как это работает</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Три шага до примерки
          </h2>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-line bg-paper-soft p-6">
              <span className="absolute right-5 top-5 font-display text-3xl font-semibold text-line">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white">
                <step.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
