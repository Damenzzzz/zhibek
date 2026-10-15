import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function About() {
  return (
    <section id="about" className="section-space scroll-mt-24">
      <div className="site-container grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
        <span className="tag self-start text-ink-soft">Создано в Шымкенте</span>
        <div>
          <h2 className="section-title max-w-2xl">
            Больше свободы
            <br />
            быть собой.
          </h2>
          <div className="mt-7 grid gap-6 text-pretty text-sm leading-relaxed text-ink-soft sm:grid-cols-2">
            <p>
              Одежда на фотографии и одежда на тебе — две разные истории. Мы
              создаём Smart Fashion, чтобы между ними было меньше неизвестности.
              Здесь можно пробовать новое сочетание до покупки.
            </p>
            <p>
              Smart Fashion объединяет подбор одежды и виртуальную примерку.
              Сохраняй любимые вещи, собирай сочетания и смотри, как они могут
              выглядеть на тебе, прежде чем сделать выбор.
            </p>
          </div>
          <Link
            href="/catalog?view=looks"
            className="mt-7 inline-flex items-center gap-3 text-sm text-clay"
          >
            Найти своё сочетание <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
