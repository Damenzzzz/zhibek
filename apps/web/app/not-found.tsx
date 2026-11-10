import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function NotFound() {
  return (
    <main className="site-container flex flex-1 flex-col items-center justify-center py-32 text-center sm:py-40">
      <p
        aria-hidden
        className="font-display text-[clamp(6rem,18vw,11rem)] italic leading-none text-clay/20"
      >
        404
      </p>
      <h1 className="-mt-4 font-display text-4xl leading-tight sm:text-5xl">
        Страница <span className="accent-italic">не нашлась</span>
      </h1>
      <p className="mt-5 max-w-sm text-pretty text-[15px] leading-relaxed text-ink-soft">
        Возможно, вещь убрали из коллекции или ссылка устарела.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/catalog" className="button-dark">
          В коллекцию <ArrowUpRight className="size-4" />
        </Link>
        <Link href="/" className="button-secondary">
          На главную
        </Link>
      </div>
    </main>
  );
}
