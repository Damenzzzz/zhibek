import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function PageHeading({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-hair-ink bg-canvas-2/50 pb-9 pt-28 sm:pb-10 sm:pt-32">
      <div className="site-container">
        <div className="mb-5 flex items-center justify-between gap-4">
          <span className="tag text-ink-soft">{label}</span>
          <Link
            href="/catalog"
            className="hidden items-center gap-2 text-xs text-ink-soft hover:text-clay sm:flex"
          >
            Коллекция Smart Fashion <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-3xl">
            <h1 className="break-words text-balance font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-sm leading-relaxed text-ink-soft sm:text-base">
              {description}
            </p>
          </div>
          {children}
        </div>
      </div>
    </header>
  );
}
