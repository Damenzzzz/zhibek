import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PrivacyControls } from "./PrivacyControls";
import { getLegalSettings } from "@/lib/legalSettings";
import { connection } from "next/server";
const links = [
  ["/catalog", "Коллекция"],
  ["/tryon", "Примерка"],
  ["/fitting-room", "Твоя подборка"],
  ["/profile", "Моя анкета"],
];
export async function SiteFooter() {
  await connection();
  const { contactEmail } = await getLegalSettings();
  return (
    <footer className="bg-espresso py-12 text-canvas">
      <div className="site-container">
        <div className="grid gap-10 border-b border-hair pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="font-display text-3xl sm:text-4xl">
              Smart Fashion.
            </Link>
            <p className="mt-5 max-w-xs text-pretty text-sm leading-relaxed text-canvas-dim">
              Примеряй новое.
              <br />
              Оставайся собой.
            </p>
          </div>
          <nav aria-label="Навигация в подвале" className="grid gap-3">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="inline-flex min-h-9 items-center gap-2 text-sm text-canvas-dim hover:text-canvas"
              >
                {label}
                <ArrowUpRight className="size-3" />
              </Link>
            ))}
          </nav>
          <div>
            <p className="text-xs text-canvas-dim">Создано в Шымкенте</p>
            <p className="mt-4 max-w-xs text-pretty text-xs leading-relaxed text-canvas-dim">
              Виртуальная примерочная с AI. Результат помогает увидеть сочетание
              одежды; размер и посадку уточняй отдельно.
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-4 inline-flex min-h-9 break-all text-xs text-canvas-dim underline underline-offset-4"
            >
              Написать CTO: {contactEmail}
            </a>
            <Link
              href="/#how-it-works"
              className="mt-5 inline-flex min-h-9 items-center text-xs underline underline-offset-4"
            >
              Как это работает
            </Link>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-4 text-[11px] text-canvas-dim">
          <p>© {new Date().getFullYear()} Smart Fashion</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className="min-h-9 content-center">
              Конфиденциальность
            </Link>
            <Link href="/terms" className="min-h-9 content-center">
              Условия
            </Link>
            <Link href="/cookies" className="min-h-9 content-center">
              Cookie
            </Link>
            <PrivacyControls />
          </div>
          <p>Меньше сомнений. Больше твоего стиля.</p>
        </div>
      </div>
    </footer>
  );
}
