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
        label="Документы"
        title={title}
        description={description}
      />
      <div className="site-container py-10 sm:py-16">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-hair-ink pb-6">
          <nav
            aria-label="Правовые документы"
            className="flex flex-wrap gap-2"
          >
            {[
              ["/privacy", "Конфиденциальность"],
              ["/cookies", "Cookie и хранилище"],
              ["/terms", "Условия использования"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="chip">
                {label}
              </Link>
            ))}
          </nav>
          <p className="text-[13px] text-ink-soft">Редакция от 15 октября 2026</p>
        </div>
        <div className="legal-copy max-w-3xl space-y-10 text-[15px] leading-relaxed text-ink-soft">
          {children}
        </div>
      </div>
    </main>
  );
}
