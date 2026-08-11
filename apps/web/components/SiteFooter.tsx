import Link from "next/link";

export function SiteFooter() {
  return (
    <footer id="about" className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <span className="font-display text-xl font-semibold tracking-tight text-ink">ZHIBEK</span>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Каталог образов и виртуальная примерочная. Собирай комплекты из готовых образов,
            примеряй их на себя и смотри результат за секунды — без походов в шоурум.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">Навигация</p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-ink-soft">
            <li>
              <Link href="/catalog" className="transition-colors hover:text-ink">
                Каталог
              </Link>
            </li>
            <li>
              <Link href="/tryon" className="transition-colors hover:text-ink">
                Примерка
              </Link>
            </li>
            <li>
              <Link href="/fitting-room" className="transition-colors hover:text-ink">
                Примерочная
              </Link>
            </li>
            <li>
              <Link href="/profile" className="transition-colors hover:text-ink">
                Профиль
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">О проекте</p>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Примерка работает на FASHN API, каталог собирается из фотосессий образов через
            Gemini. Это учебный MVP-проект.
          </p>
        </div>
      </div>

      <div className="border-t border-line px-4 py-5 text-center text-xs text-ink-soft sm:px-6 lg:px-8">
        © {new Date().getFullYear()} ZHIBEK
      </div>
    </footer>
  );
}
