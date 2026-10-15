"use client";
import { useState, type FormEvent } from "react";
import { useStoredProfile } from "@/lib/profileStorage";
import { PRIVACY_VERSION } from "@/lib/privacy";
export function PrivacyRequestForm() {
  const profile = useStoredProfile();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/privacy/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(fields),
          consentVersion: PRIVACY_VERSION,
          consent: fields.get("consent") === "true",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setResult(`${data.message} Номер: ${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось отправить обращение",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id="request"
      className="mt-12 scroll-mt-28 rounded-2xl border border-hair-ink bg-canvas-2/30 p-5 sm:p-8"
    >
      <h2 className="font-display text-2xl">
        Обращение по персональным данным
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Можно запросить доступ, исправление или удаление данных и отозвать
        согласие. Администратор может уточнить принадлежность данных перед
        выполнением запроса.
      </p>
      {result ? (
        <p
          role="status"
          className="mt-6 break-all text-sm leading-relaxed text-clay"
        >
          {result}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <label className="block text-sm">
            Тип обращения
            <select
              name="type"
              className="mt-2 min-h-12 w-full rounded-lg border border-hair-ink bg-canvas px-3"
            >
              <option value="access">Получить сведения о данных</option>
              <option value="delete">Удалить мои данные</option>
              <option value="withdraw">Отозвать согласие</option>
              <option value="correct">Исправить данные</option>
            </select>
          </label>
          <label className="block text-sm">
            Email для ответа
            <input
              type="email"
              name="email"
              maxLength={254}
              className="mt-2 min-h-12 w-full rounded-lg border border-hair-ink bg-transparent px-3"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm">
            ID анкеты
            <input
              key={profile?.id ?? "empty"}
              name="userId"
              defaultValue={profile?.id ?? ""}
              maxLength={64}
              className="mt-2 min-h-12 w-full rounded-lg border border-hair-ink bg-transparent px-3"
            />
            <span className="mt-2 block text-xs leading-relaxed text-ink-soft">
              Если анкета есть в этом браузере, ID подставится автоматически.
              Укажи email или ID; email нужен для ответа.
            </span>
          </label>
          <label className="block text-sm">
            Что нужно сделать
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className="mt-2 w-full rounded-lg border border-hair-ink bg-transparent p-3"
            />
          </label>
          <label className="flex gap-3 text-xs leading-relaxed text-ink-soft">
            <input
              type="checkbox"
              name="consent"
              value="true"
              required
              className="mt-1 size-4 shrink-0 accent-clay"
            />
            Согласен на обработку данных этого обращения для его рассмотрения и
            ответа.
          </label>
          {error && (
            <p role="alert" className="text-sm text-clay">
              {error}
            </p>
          )}
          <button disabled={busy} className="button-primary" type="submit">
            {busy ? "Сохраняем обращение…" : "Отправить обращение"}
          </button>
        </form>
      )}
    </section>
  );
}
