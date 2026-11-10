import { Plus } from "lucide-react";

const questions = [
  [
    "Нужно ли создавать аккаунт?",
    "Нет. Анкета и подборка сохраняются в текущем браузере. На другом устройстве или после очистки данных браузера их понадобится создать заново.",
  ],
  [
    "Можно примерить без своего фото?",
    "Да. Выбери «Модель по анкете», укажи параметры — и мы сгенерируем модель для примерки.",
  ],
  [
    "Можно ли узнать точный размер?",
    "Примерка показывает, как может выглядеть сочетание одежды. Она не гарантирует точный размер или посадку — их стоит сверять с параметрами вещи.",
  ],
  [
    "Кто может видеть результаты?",
    "Сгенерированные изображения сохраняются на сайте. Администраторы могут просматривать их для проверки качества и улучшения работы сервиса.",
  ],
];

export function Questions() {
  return (
    <section className="section-space border-t border-hair-ink">
      <div className="site-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <span className="label text-clay">Перед первой примеркой</span>
          <h2 className="section-title mt-5">
            Вопросы?
            <br />
            <span className="accent-italic">Всё расскажем.</span>
          </h2>
        </div>
        <div className="border-t border-hair-ink">
          {questions.map(([question, answer]) => (
            <details key={question} className="group border-b border-hair-ink">
              <summary className="flex min-h-[4.5rem] list-none items-center justify-between gap-5 py-5 text-base font-medium transition-colors hover:text-clay sm:text-lg">
                {question}
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hair-ink transition-[transform,background-color,border-color,color] duration-300 group-open:rotate-45 group-open:border-clay group-open:bg-clay group-open:text-canvas"
                >
                  <Plus className="size-4" strokeWidth={1.75} />
                </span>
              </summary>
              <p className="max-w-xl animate-fade-in pb-6 pr-12 text-pretty text-[15px] leading-relaxed text-ink-soft">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
