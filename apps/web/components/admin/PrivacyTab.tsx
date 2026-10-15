"use client";
import { useEffect, useState, type FormEvent } from "react";
interface Entry {
  id: string;
  userId: string | null;
  email: string | null;
  type: string;
  message: string;
  status: string;
  createdAt: string;
}
const labels: Record<string, string> = {
  access: "Доступ к данным",
  delete: "Удаление данных",
  withdraw: "Отзыв согласия",
  correct: "Исправление данных",
};
export function PrivacyTab() {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [error, setError] = useState<string | null>(null),
    [saving, setSaving] = useState(false);
  const [data, setData] = useState<{
    settings: { operatorName: string; contactEmail: string };
    requests: Entry[];
    hasMore: boolean;
    page: number;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/admin/privacy?page=${page}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            "Не удалось загрузить обращения. Проверь вход в админку.",
          );
        const result = await response.json();
        if (!controller.signal.aborted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
      }
    }
    void load();
    return () => controller.abort();
  }, [page, revision]);
  async function update(input: unknown) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/privacy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Не удалось сохранить изменения");
      setRevision((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }
  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void update({
      action: "settings",
      ...Object.fromEntries(new FormData(event.currentTarget)),
    });
  }
  return (
    <section className="mt-8 space-y-9">
      {error && (
        <p role="alert" className="text-sm text-clay">
          {error}
        </p>
      )}
      {!data ? (
        <p className="text-sm text-ink-soft">Загрузка…</p>
      ) : (
        <>
          <form
            key={JSON.stringify(data.settings)}
            onSubmit={saveSettings}
            className="max-w-2xl rounded-xl border border-hair-ink p-5"
          >
            <h2 className="font-display text-2xl">Реквизиты для политики</h2>
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              Укажите владельца/оператора и email для обращений. Они появятся в
              публичной политике. Содержимое обращений доступно только в
              админке.
            </p>
            <label className="mt-5 block text-sm">
              Имя или организация
              <input
                name="operatorName"
                required
                minLength={2}
                maxLength={200}
                defaultValue={data.settings.operatorName}
                className="mt-2 min-h-12 w-full rounded-lg border border-hair-ink bg-transparent px-3"
              />
            </label>
            <label className="mt-5 block text-sm">
              Контактный email
              <input
                name="contactEmail"
                type="email"
                defaultValue={data.settings.contactEmail}
                className="mt-2 min-h-12 w-full rounded-lg border border-hair-ink bg-transparent px-3"
              />
            </label>
            <button
              disabled={saving}
              type="submit"
              className="button-primary mt-5"
            >
              {saving ? "Сохраняем…" : "Сохранить реквизиты"}
            </button>
          </form>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-2xl">Обращения пользователей</h2>
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
              className="button-secondary"
            >
              Обновить
            </button>
          </div>
          <p className="text-xs leading-relaxed text-ink-soft">
            Проверьте принадлежность данных перед выполнением запроса. Изменение
            статуса само по себе не удаляет данные и не отправляет ответ
            пользователю.
          </p>
          {!data.requests.length ? (
            <p className="border border-hair-ink p-8 text-sm text-ink-soft">
              Пока нет обращений.
            </p>
          ) : (
            data.requests.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl border border-hair-ink p-5"
              >
                <div className="flex flex-wrap justify-between gap-4">
                  <h3 className="font-medium">
                    {labels[entry.type] ?? entry.type}
                  </h3>
                  <time className="text-xs text-ink-soft">
                    {new Date(entry.createdAt).toLocaleString("ru-RU", {
                      timeZone: "Asia/Almaty",
                    })}
                  </time>
                </div>
                <p className="mt-3 break-all text-xs text-ink-soft">
                  № {entry.id} · Анкета: {entry.userId ?? "не указана"} · Email:{" "}
                  {entry.email ?? "не указан"}
                </p>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {entry.message}
                </p>
                <label className="mt-5 flex items-center gap-3 text-xs">
                  Статус
                  <select
                    disabled={saving}
                    value={entry.status}
                    onChange={(event) =>
                      void update({
                        action: "request",
                        id: entry.id,
                        status: event.target.value,
                      })
                    }
                    className="min-h-11 rounded-lg border border-hair-ink bg-canvas px-3"
                  >
                    <option value="new">Новое</option>
                    <option value="in_progress">В работе</option>
                    <option value="resolved">Рассмотрено</option>
                  </select>
                </label>
              </article>
            ))
          )}
          <nav
            className="flex items-center gap-4"
            aria-label="Страницы обращений"
          >
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              className="button-secondary"
            >
              Назад
            </button>
            <span className="text-xs tabular-nums">Страница {page}</span>
            <button
              type="button"
              disabled={!data.hasMore}
              onClick={() => setPage((value) => value + 1)}
              className="button-secondary"
            >
              Далее
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
