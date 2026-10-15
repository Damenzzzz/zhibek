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
      <div className="site-container grid gap-9 lg:grid-cols-2 lg:gap-20">
        <div>
          <span className="tag text-ink-soft">Перед первой примеркой</span>
          <h2 className="section-title mt-5">
            Вопросы?
            <br />
            Всё расскажем.
          </h2>
        </div>
        <div>
          {questions.map(([question, answer]) => (
            <details
              key={question}
              className="group border-b border-hair-ink py-5"
            >
              <summary className="flex min-h-9 list-none items-center justify-between gap-5 text-sm font-medium">
                {question}
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border border-hair-ink group-open:hidden"
                >
                  +
                </span>
                <span
                  aria-hidden
                  className="hidden size-7 shrink-0 items-center justify-center rounded-full border border-hair-ink group-open:flex"
                >
                  −
                </span>
              </summary>
              <p className="mt-4 max-w-lg text-pretty pr-6 text-sm leading-relaxed text-ink-soft">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
