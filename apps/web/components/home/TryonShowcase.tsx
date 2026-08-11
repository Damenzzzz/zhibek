import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SkeletonImage } from "@/components/SkeletonImage";

export function TryonShowcase() {
  return (
    <section className="border-t border-line bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="order-2 lg:order-1">
          <span className="eyebrow">Результат</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Смотри «до» и «после» в одном экране
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft sm:text-base">
            Каждая примерка сохраняется в историю — можно вернуться и сравнить образы,
            скачать понравившийся результат или сразу перейти к покупке.
          </p>
          <Link
            href="/tryon"
            className="group mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Попробовать примерку
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </Link>
        </div>

        <div className="order-1 grid grid-cols-2 gap-3 sm:gap-4 lg:order-2">
          <div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-paper-soft">
              <SkeletonImage src="/hero-model.png" alt="До примерки" sizes="(max-width: 1024px) 45vw, 22vw" className="object-top" />
            </div>
            <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.15em] text-ink-soft">До</p>
          </div>
          <div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-paper-soft">
              <SkeletonImage src="/tryon-demo.png" alt="После примерки" sizes="(max-width: 1024px) 45vw, 22vw" className="object-top" />
            </div>
            <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.15em] text-ink-soft">После</p>
          </div>
        </div>
      </div>
    </section>
  );
}
