import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line/70 bg-bone/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/catalog" className="group flex items-baseline gap-2">
          <span className="font-display text-2xl italic tracking-tight text-ink">Zhibek</span>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-ink-soft sm:inline">
            жібек · silk
          </span>
        </Link>
        <nav className="text-sm text-ink-soft">
          <Link href="/catalog" className="transition-colors hover:text-accent">
            Каталог
          </Link>
        </nav>
      </div>
    </header>
  );
}
