import { SkeletonImage } from "@/components/SkeletonImage";

// Пункт меню "О нас" раньше вёл в подвал — там лежал id="about" и три строчки
// мелким текстом. Теперь это полноценный разворот на главной, а якорь снят
// с футера (см. SiteFooter).

const FACTS = [
  { k: "Что это", v: "Каталог образов и виртуальная примерочная" },
  { k: "Где", v: "Шымкент, онлайн" },
  { k: "Каталог", v: "Живые съёмки, разбор через Gemini" },
  { k: "Примерка", v: "Gemini, весь образ за один проход" },
  { k: "Аккаунт", v: "Не нужен — анкета живёт в браузере" },
];

export function About() {
  return (
    <section id="about" className="relative scroll-mt-24 overflow-hidden bg-canvas py-24 sm:py-32">
      <div className="warp-lines pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative z-10 mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-14">
        <div className="on-view grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* Фото со сдвинутой подложкой — тот же приём, что в hero, чтобы
              страница читалась одной вёрсткой, а не набором блоков. */}
          <div className="relative mx-auto w-full max-w-xs lg:mx-0 lg:max-w-none">
            <span className="pointer-events-none absolute -bottom-4 -right-4 hidden h-full w-full border border-clay/40 sm:block" />
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-canvas-2">
              <SkeletonImage
                src="/tryon-demo.png"
                alt="Образ из каталога ZHIBEK"
                sizes="(max-width: 1024px) 80vw, 34vw"
                className="object-top"
                placeholderClassName="bg-canvas-2"
              />
            </div>
          </div>

          <div>
            <span className="tag text-ink-soft">о нас</span>
            <h2 className="mt-5 font-display text-[clamp(2.25rem,6vw,4.75rem)] uppercase leading-[0.88] tracking-[-0.02em]">
              Жібек —<br />
              это <span className="stroke-clay">шёлк</span>
            </h2>

            <div className="mt-8 max-w-xl space-y-5 font-grotesk text-[15px] leading-relaxed text-ink-soft">
              <p>
                {/* Первая буква врезкой — журнальная буквица, единственное место
                    на сайте, где она уместна. */}
                <span className="float-left mr-3 mt-1 font-display text-[3.5rem] leading-[0.75] text-clay">
                  М
                </span>
                ы начали с простого раздражения: одежду в интернете покупаешь вслепую.
                Фото на модели ростом 178 и весом 52 ничего не говорит о том, как вещь
                сядет на тебя. Половина заказов уезжает обратно.
              </p>
              <p>
                ZHIBEK разбирает съёмки образов на отдельные вещи, помнит, что с чем
                снималось, и накладывает их на твою фигуру нейросетью. Никаких кабинок,
                очередей и «а можно другой размер».
              </p>
              <p className="text-ink">
                Название — казахское <span className="text-clay">жібек</span>, шёлк. Отсюда
                и палитра сайта: натуральные красители — марена, шафран, шалфей.
              </p>
            </div>

            <dl className="mt-10 border-t border-hair-ink">
              {FACTS.map((f) => (
                <div
                  key={f.k}
                  className="grid grid-cols-[7rem_1fr] gap-4 border-b border-hair-ink py-3.5 sm:grid-cols-[10rem_1fr]"
                >
                  <dt className="font-grotesk text-[10px] uppercase tracking-[0.24em] text-clay">
                    {f.k}
                  </dt>
                  <dd className="font-grotesk text-[13px] text-ink">{f.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
