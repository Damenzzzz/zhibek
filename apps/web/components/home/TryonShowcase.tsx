import Link from "next/link";
import { ArrowUpRight, MoveHorizontal } from "lucide-react";
import { BeforeAfter } from "./BeforeAfter";
export function TryonShowcase() {
  return (
    <section className="section-space bg-espresso text-canvas">
      <div className="site-container grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="mx-auto w-full max-w-lg">
          <BeforeAfter before="/hero-model.png" after="/tryon-demo.png" />
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-canvas-dim">
            <MoveHorizontal className="size-4" />
            Потяни разделитель и сравни
          </p>
        </div>
        <div>
          <span className="tag text-canvas-dim">Новый взгляд на привычное</span>
          <h2 className="section-title mt-6">
            Тот же человек.
            <br />
            <span className="text-canvas-dim">Совсем другой образ.</span>
          </h2>
          <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-canvas-dim">
            От первой идеи до полного сочетания. Примеряй сразу весь комплект, а
            затем сравнивай детали на своём фото или модели по анкете.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-canvas-dim">
            {[
              "Верх, низ, обувь и сумка в одной примерке",
              "История результатов под рукой",
              "Готовое изображение можно скачать",
            ].map((text, i) => (
              <li key={text} className="flex gap-4 border-t border-hair pt-4">
                <span className="tabular-nums text-canvas">0{i + 1}</span>
                {text}
              </li>
            ))}
          </ul>
          <Link
            href="/tryon"
            className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-full bg-canvas px-6 py-3 text-sm text-ink"
          >
            Попробовать на себе <ArrowUpRight className="size-4" />
          </Link>
          <p className="mt-5 max-w-md text-xs leading-relaxed text-canvas-dim">
            AI-примерка помогает оценить образ. Она не заменяет проверку размера
            и посадки.
          </p>
        </div>
      </div>
    </section>
  );
}
