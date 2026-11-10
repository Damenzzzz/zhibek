import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeading({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: React.ReactNode;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-hair-ink bg-canvas-2/45 pb-10 pt-28 sm:pb-14 sm:pt-32">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-24 h-80 w-80 rounded-full bg-clay-soft/60 blur-3xl"
      />
      <div className="site-container relative">
        <nav
          aria-label="Хлебные крошки"
          className="flex items-center gap-1.5 text-[13px] text-ink-soft"
        >
          <Link href="/" className="transition-colors hover:text-clay">
            Главная
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span aria-current="page" className="text-ink">
            {label}
          </span>
        </nav>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
          <div className="min-w-0 max-w-3xl">
            <h1 className="break-words text-balance font-display text-[clamp(2.5rem,6vw,4.75rem)] leading-[1.02] tracking-[-0.02em]">
              {title}
            </h1>
            <p className="lead mt-5 max-w-xl">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </header>
  );
}
