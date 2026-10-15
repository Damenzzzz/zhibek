import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function FinalCta() {
  return (
    <section className="bg-clay py-14 text-canvas sm:py-20">
      <div className="site-container flex flex-wrap items-center justify-between gap-8">
        <div>
          <p className="text-xs text-canvas/80">
            Следующий образ — уже где-то здесь.
          </p>
          <h2 className="mt-4 text-balance font-display text-3xl sm:text-5xl">
            Дай себе примерить новое.
          </h2>
        </div>
        <Link
          href="/catalog?view=looks"
          className="inline-flex min-h-12 items-center gap-3 rounded-full bg-canvas px-7 py-4 text-sm text-ink"
        >
          Открыть коллекцию <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
