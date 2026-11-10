// Бегущая строка-разделитель между первым экраном и витриной. Чисто
// декоративная (aria-hidden), без ссылок: двигающиеся ссылки трудно нажать.
// При prefers-reduced-motion строка стоит на месте (см. globals.css).
const words = [
  "Верх",
  "Низ",
  "Верхняя одежда",
  "Обувь",
  "Сумки",
  "Аксессуары",
  "Готовые образы",
];

export function CategoryBand() {
  const row = [...words, ...words];
  return (
    <div
      aria-hidden
      className="overflow-hidden border-y border-hair-ink bg-surface/50 py-5"
    >
      <div className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {row.map((word, i) => (
              <span
                key={`${copy}-${i}`}
                className="flex items-center whitespace-nowrap font-display text-2xl italic text-ink/80 sm:text-3xl"
              >
                {word}
                <span className="mx-7 size-1.5 rounded-full bg-clay sm:mx-10" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
