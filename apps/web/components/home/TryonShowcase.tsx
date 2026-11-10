import Link from "next/link";
import { ArrowUpRight, Download, History, Layers } from "lucide-react";
import { BeforeAfter } from "./BeforeAfter";

const features = [
  { icon: Layers, text: "Верх, низ, обувь и сумка в одной примерке" },
  { icon: History, text: "История результатов всегда под рукой" },
  { icon: Download, text: "Готовое изображение можно скачать" },
];

export function TryonShowcase() {
  return (
    <section className="section-space relative overflow-hidden bg-espresso text-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-clay/25 blur-3xl"
      />
      <div className="site-container relative grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
        <div className="mx-auto w-full max-w-md lg:max-w-lg">
          <BeforeAfter before="/hero-model.png" after="/tryon-demo.png" />
        </div>
        <div>
          <span className="label text-saffron">Новый взгляд на привычное</span>
          <h2 className="section-title mt-6">
            Тот же человек.
            <br />
            <span className="font-display italic text-canvas-dim">
              Совсем другой образ.
            </span>
          </h2>
          <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-canvas-dim sm:text-lg">
            От первой идеи до полного сочетания. Примеряй сразу весь комплект, а
            затем сравнивай детали на своём фото или модели по анкете.
          </p>
          <ul className="mt-9 max-w-md divide-y divide-hair border-y border-hair">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 py-4 text-[15px]">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-canvas/8 ring-1 ring-hair">
                  <Icon className="size-[1.125rem] text-saffron" strokeWidth={1.6} />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/tryon" className="button-light button-lg">
              Попробовать на себе <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <p className="mt-5 max-w-md text-[13px] leading-relaxed text-canvas-dim">
            AI-примерка помогает оценить образ. Она не заменяет проверку размера
            и посадки.
          </p>
        </div>
      </div>
    </section>
  );
}
