import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function About({
  itemCount,
  lookCount,
}: {
  itemCount: number;
  lookCount: number;
}) {
  const stats = [
    { value: itemCount, label: "вещей в коллекции" },
    { value: lookCount, label: "готовых образов" },
    { value: 0, label: "регистраций нужно" },
  ];
  return (
    <section id="about" className="section-space">
      <div className="site-container grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <span className="label text-clay">Создано в Шымкенте</span>
          <blockquote className="mt-7 font-display text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.18] tracking-[-0.01em]">
            <span className="text-clay">«</span>Одежда на фотографии и одежда на
            тебе — <span className="italic">две разные истории.</span>
            <span className="text-clay">»</span>
          </blockquote>
          <p className="mt-6 text-[15px] text-ink-soft">
            Мы создаём Smart Fashion, чтобы между ними было меньше
            неизвестности.
          </p>
        </div>
        <div className="lg:pt-12">
          <h2 className="section-title max-w-xl">
            Больше свободы <span className="accent-italic">быть собой.</span>
          </h2>
          <div className="mt-7 grid gap-5 text-pretty text-[15px] leading-relaxed text-ink-soft sm:grid-cols-2">
            <p>
              Здесь можно пробовать новое сочетание до покупки — без кабинок,
              очередей и спешки.
            </p>
            <p>
              Сохраняй любимые вещи, собирай сочетания и смотри, как они могут
              выглядеть на тебе, прежде чем сделать выбор.
            </p>
          </div>
          <dl className="mt-10 grid grid-cols-3 divide-x divide-hair-ink border-y border-hair-ink">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col-reverse px-4 py-6 first:pl-0"
              >
                <dt className="mt-2 text-[13px] leading-snug text-ink-soft">
                  {stat.label}
                </dt>
                <dd className="font-display text-4xl tabular-nums leading-none sm:text-5xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          <Link href="/catalog?view=looks" className="link-arrow mt-8">
            Найти своё сочетание <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
