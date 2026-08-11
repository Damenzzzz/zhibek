import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCta() {
  return (
    <section className="border-t border-line bg-ink py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Хватит гадать, подойдёт ли
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
          Заполни анкету один раз — и примеряй любые образы из каталога за секунды.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/profile"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-ink transition-opacity hover:opacity-90"
          >
            Заполнить анкету
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </Link>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-medium text-white transition-colors hover:border-white/50"
          >
            Сначала посмотреть каталог
          </Link>
        </div>
      </div>
    </section>
  );
}
