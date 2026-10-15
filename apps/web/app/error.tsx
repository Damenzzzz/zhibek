"use client";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="site-container flex min-h-[65dvh] flex-1 flex-col items-center justify-center py-32 text-center">
      <p className="tag text-ink-soft">Небольшая заминка</p>
      <h1 className="mt-6 font-display text-3xl sm:text-5xl">
        Попробуем ещё раз?
      </h1>
      <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-ink-soft">
        Не получилось загрузить эту страницу. Проверь соединение и повтори
        попытку.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="button-primary">
          <RefreshCw className="size-4" />
          Повторить
        </button>
        <Link href="/" className="button-secondary">
          На главную
        </Link>
      </div>
    </main>
  );
}
