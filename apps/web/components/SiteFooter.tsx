import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { PrivacyControls } from "./PrivacyControls";
import { getLegalSettings } from "@/lib/legalSettings";
import { connection } from "next/server";

const links = [
  ["/catalog", "Коллекция"],
  ["/tryon", "Примерка"],
  ["/fitting-room", "Твоя подборка"],
  ["/profile", "Моя анкета"],
  ["/#how-it-works", "Как это работает"],
];

export async function SiteFooter() {
  await connection();
  const { contactEmail } = await getLegalSettings();
  return (
    <footer className="bg-espresso pb-8 pt-16 text-canvas sm:pt-20">
      <div className="site-container">
        <div className="grid gap-12 border-b border-hair pb-12 md:grid-cols-[1.5fr_1fr_1.2fr]">
          <div>
            <Link
              href="/"
              className="font-display text-4xl leading-none tracking-[-0.01em] sm:text-5xl"
            >
              Smart <span className="italic">Fashion</span>
              <span className="text-clay">.</span>
            </Link>
            <p className="mt-6 max-w-xs font-display text-xl italic leading-snug text-canvas-dim">
              Примеряй новое.
              <br />
              Оставайся собой.
            </p>
          </div>
          <nav aria-label="Навигация в подвале">
            <p className="label text-canvas-dim">Разделы</p>
            <ul className="mt-5 grid gap-1">
              {links.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group inline-flex min-h-10 items-center gap-2 text-[15px] text-canvas/90 transition-colors hover:text-canvas"
                  >
                    {label}
                    <ArrowUpRight className="size-3.5 text-canvas-dim transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-saffron" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="label text-canvas-dim">Создано в Шымкенте</p>
            <p className="mt-5 max-w-xs text-pretty text-[15px] leading-relaxed text-canvas-dim">
              Виртуальная примерочная с AI. Результат помогает увидеть сочетание
              одежды; размер и посадку уточняй отдельно.
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-6 inline-flex min-h-11 max-w-full items-center gap-3 rounded-full border border-hair px-5 text-sm text-canvas transition-colors hover:border-canvas/60 hover:bg-canvas/5"
            >
              <Mail className="size-4 shrink-0 text-saffron" strokeWidth={1.6} />
              <span className="truncate">Написать CTO</span>
            </a>
            <p className="mt-3 break-all text-[13px] text-canvas-dim">
              {contactEmail}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-4 text-[13px] text-canvas-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Smart Fashion</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <Link href="/privacy" className="inline-flex min-h-10 items-center hover:text-canvas">
              Конфиденциальность
            </Link>
            <Link href="/terms" className="inline-flex min-h-10 items-center hover:text-canvas">
              Условия
            </Link>
            <Link href="/cookies" className="inline-flex min-h-10 items-center hover:text-canvas">
              Cookie
            </Link>
            <PrivacyControls />
          </div>
        </div>
      </div>
    </footer>
  );
}
