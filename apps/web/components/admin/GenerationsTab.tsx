"use client";

import { useEffect, useState } from "react";
import type { AdminGenerationsPage, GenerationKind } from "@/lib/adminGenerations";

const BUTTON = "border border-hair-ink px-4 py-2 font-grotesk text-[12px] text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50";

export function GenerationsTab() {
  const [kind, setKind] = useState<GenerationKind>("all");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<AdminGenerationsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const response = await fetch(`/api/admin/generations?kind=${kind}&page=${page}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(response.status === 401 ? "Сессия завершена. Войди в админку заново." : "Не удалось загрузить генерации");
        }
        const result = await response.json() as AdminGenerationsPage;
        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Не удалось загрузить генерации");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [kind, page, revision]);

  return (
    <section className="mt-8" aria-label="Генерации пользователей">
      <p className="max-w-3xl font-grotesk text-sm leading-relaxed text-ink-soft">
        Результаты виртуальной примерки и модели по анкете, от новых к старым.
        Галерея доступна после входа в админку. Модели по анкете учитываются с момента
        добавления этой вкладки; сохранённые примерки доступны и за прошлые даты.
      </p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <label className="flex flex-col gap-2 font-grotesk text-[12px] text-ink-soft">
          Тип генерации
          <select
            value={kind}
            onChange={(event) => { setKind(event.target.value as GenerationKind); setPage(1); }}
            className="border border-hair-ink bg-canvas px-3 py-2 text-sm text-ink"
          >
            <option value="all">Все генерации</option>
            <option value="tryon">Примерки</option>
            <option value="model">Модели по анкете</option>
          </select>
        </label>
        <button type="button" className={BUTTON} disabled={loading} onClick={() => setRevision((value) => value + 1)}>
          Обновить
        </button>
      </div>
      <div className="mt-6" aria-live="polite" aria-busy={loading}>
        {loading && <p className="font-grotesk text-sm text-ink-soft">Загрузка генераций…</p>}
        {error && <p role="alert" className="font-grotesk text-sm text-clay">{error}</p>}
        {data && data.items.length === 0 && (
          <p className="border border-hair-ink p-8 font-grotesk text-sm text-ink-soft">Пока нет сохранённых генераций этого типа.</p>
        )}
        {data && data.items.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((item) => (
              <article key={`${item.kind}-${item.id}`} className="min-w-0 border border-hair-ink">
                <a href={item.imagePath} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="block bg-canvas-2" aria-label="Открыть результат в полном размере">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imagePath} alt={item.kind === "tryon" ? "Результат виртуальной примерки" : "Модель по анкете"} loading="lazy" referrerPolicy="no-referrer" className="aspect-[3/4] w-full object-contain" />
                </a>
                <div className="space-y-2 p-4 font-grotesk text-[12px] text-ink-soft">
                  <h2 className="text-sm font-medium text-ink">{item.kind === "tryon" ? "Примерка" : "Модель по анкете"}</h2>
                  <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" })} (Алматы)</time>
                  <p className="break-all" title={item.userId}>Профиль: {item.userId}</p>
                  {item.lookId && <p>Образ: {item.lookId}</p>}
                  <a href={item.imagePath} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-block text-clay underline underline-offset-4">Открыть оригинал</a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <nav className="mt-6 flex flex-wrap items-center gap-4" aria-label="Страницы генераций">
        <button type="button" className={BUTTON} disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)}>Назад</button>
        <span className="font-grotesk text-[12px] text-ink-soft">Страница {page}</span>
        <button type="button" className={BUTTON} disabled={loading || !data?.hasMore} onClick={() => setPage((value) => value + 1)}>Далее</button>
      </nav>
    </section>
  );
}
