// Бегущая строка-разделитель между первым экраном и витриной. Тёмная полоса,
// слова по очереди вспыхивают бликом, точки пульсируют — привлекает взгляд,
// но не мешает читать. Чисто декоративная (aria-hidden), без ссылок:
// двигающиеся ссылки трудно нажать. На наведение — пауза. При
// prefers-reduced-motion всё стоит на месте (см. globals.css).
const words = [
  "Верх",
  "Низ",
  "Верхняя одежда",
  "Обувь",
  "Сумки",
  "Аксессуары",
  "Готовые образы",
  "AI-примерка",
];

export function CategoryBand() {
  const row = [...words, ...words];
  return (
    <div
      aria-hidden
      className="marquee relative overflow-hidden bg-espresso py-6 sm:py-7"
    >
      {/* Края растворяются, чтобы строка не обрывалась резко */}
      <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-espresso to-transparent sm:w-32" />
      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-espresso to-transparent sm:w-32" />
      <div className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {row.map((word, i) => (
              <span
                key={`${copy}-${i}`}
                className="flex items-center whitespace-nowrap"
              >
                <span
                  className="shimmer-word font-display text-xl uppercase tracking-[0.14em] sm:text-2xl"
                  style={{ "--i": i % words.length } as React.CSSProperties}
                >
                  {word}
                </span>
                <span
                  className="pulse-dot mx-8 size-1.5 rounded-full bg-saffron sm:mx-12"
                  style={{ "--i": i % words.length } as React.CSSProperties}
                />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
