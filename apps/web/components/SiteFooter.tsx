import Link from "next/link";

const NAV = [
  { href: "/catalog", label: "Каталог" },
  { href: "/tryon", label: "Примерка" },
  { href: "/fitting-room", label: "Примерочная" },
  { href: "/profile", label: "Профиль" },
];

// Подвал общий для всех страниц, но набран в тёмном editorial-слое: он
// замыкает светлую финальную плашку главной и одинаково работает под
// светлыми разделами как контрастная полоса выходных данных.
export function SiteFooter() {
  return (
    // id="about" переехал на секцию главной (components/home/About.tsx) —
    // "О нас" в меню теперь ведёт на разворот, а не в выходные данные.
    <footer className="grain grain-dark relative overflow-hidden bg-espresso text-canvas">
      <div className="relative z-10 mx-auto max-w-[88rem] px-5 pt-16 sm:px-8 lg:px-14">
        <div className="grid gap-10 border-b border-hair pb-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <span className="tag text-canvas-dim">жібек · шёлк</span>
            <p className="mt-5 font-grotesk text-sm leading-relaxed text-canvas-dim">
              Каталог образов и виртуальная примерочная. Комплекты собираются из готовых
              съёмок, примеряются на твою фигуру и остаются в истории — без походов
              в шоурум.
            </p>
          </div>

          <nav>
            <p className="font-grotesk text-[10px] uppercase tracking-[0.3em] text-clay">
              Разделы
            </p>
            <ul className="mt-5 flex flex-col gap-3 font-grotesk text-sm text-canvas-dim">
              {NAV.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-canvas">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="font-grotesk text-[10px] uppercase tracking-[0.3em] text-clay">
              О проекте
            </p>
            <p className="mt-5 font-grotesk text-sm leading-relaxed text-canvas-dim">
              Примерка работает на нейросети Gemini, каталог собирается из
              фотосессий тоже через Gemini. Учебный MVP.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-6 font-grotesk text-[10px] uppercase tracking-[0.28em] text-canvas-dim">
          <span>© {new Date().getFullYear()} ZHIBEK</span>
          <span>Shymkent</span>
        </div>
      </div>

      {/* Логотип во всю ширину, срезанный нижним краем — выходные данные
          разворота. aria-hidden: это графика, а не читаемый текст. */}
      <div aria-hidden className="relative z-10 select-none overflow-hidden">
        <span className="stroke-canvas block translate-y-[0.18em] whitespace-nowrap text-center font-editorial text-[19vw] uppercase leading-[0.75] tracking-[0.02em] opacity-40">
          Zhibek
        </span>
      </div>
    </footer>
  );
}
