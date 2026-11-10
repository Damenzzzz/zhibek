import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-clay py-20 text-canvas sm:py-28">
      {/* Крупная курсивная подпись фоном — фактура вместо картинки */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-[0.18em] right-[-0.05em] select-none whitespace-nowrap font-display text-[clamp(6rem,15vw,14rem)] italic leading-none text-canvas/[0.07]"
      >
        Smart Fashion
      </span>
      <div className="site-container relative">
        <p className="label text-canvas">Следующий образ — уже где-то здесь</p>
        <h2 className="mt-6 max-w-3xl text-balance font-display text-[clamp(2.4rem,5.5vw,4.75rem)] leading-[1.02] tracking-[-0.02em]">
          Дай себе <span className="italic">примерить новое.</span>
        </h2>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/catalog?view=looks" className="button-light button-lg">
            Открыть коллекцию <ArrowUpRight className="size-4" />
          </Link>
          <Link href="/tryon" className="button-ghost-light button-lg">
            Начать примерку
          </Link>
        </div>
      </div>
    </section>
  );
}
