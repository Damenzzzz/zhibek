import Link from "next/link";
import { PageHeading } from "./PageHeading";
export function LegalDocument({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <PageHeading
        label="Документы Smart Fashion · 15 октября 2026"
        title={title}
        description={description}
      />
      <div className="site-container py-10 sm:py-16">
        <nav
          aria-label="Правовые документы"
          className="mb-10 flex flex-wrap gap-3 border-b border-hair-ink pb-6 text-xs"
        >
          {[
            ["/privacy", "Конфиденциальность"],
            ["/cookies", "Cookie и хранилище"],
            ["/terms", "Условия использования"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="button-secondary text-xs">
              {label}
            </Link>
          ))}
        </nav>
        <div className="legal-copy max-w-3xl space-y-9 text-sm leading-relaxed text-ink-soft">
          {children}
        </div>
      </div>
    </main>
  );
}
