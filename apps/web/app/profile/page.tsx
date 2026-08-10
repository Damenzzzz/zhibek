"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { PROFILE_STORAGE_KEY, type StoredProfile } from "@/lib/profileStorage";

// Клиентский предохранитель поверх серверного poll-таймаута FASHN (3 минуты,
// см. lib/fashn.ts) — если сервер вообще не ответит, не виснем бесконечно.
const CLIENT_TIMEOUT_MS = 4 * 60 * 1000;

const BODY_TYPES = [
  { value: "slim", label: "Стройное" },
  { value: "athletic", label: "Спортивное" },
  { value: "average", label: "Среднее" },
  { value: "plus-size", label: "Полное" },
];

const GENDERS = [
  { value: "female", label: "Женский" },
  { value: "male", label: "Мужской" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [noPhoto, setNoPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "generating">("idle");
  const [error, setError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    if (noPhoto) {
      formData.delete("photo");
      formData.set("no_photo", "true");
    } else {
      formData.delete("no_photo");
    }

    setStatus(noPhoto ? "generating" : "saving");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Не удалось сохранить анкету");
        setStatus("idle");
        return;
      }

      const profile: StoredProfile = data.user;
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      router.push("/tryon");
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "Не дождались ответа от FASHN — попробуй ещё раз"
          : "Не удалось связаться с сервером"
      );
      setStatus("idle");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const busy = status !== "idle";

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-[11px] uppercase tracking-[0.3em] text-accent">Анкета</p>
        <div className="mt-2 h-[2px] w-12 bg-gradient-to-r from-gold to-transparent" />
        <h1 className="mt-3 font-display text-4xl italic tracking-tight text-ink">Твоя мерка</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Это нужно, чтобы точнее подобрать образ и подготовить модель для примерки.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm text-ink">
              Рост, см
              <input
                type="number"
                name="height_cm"
                min={50}
                max={250}
                required
                placeholder="170"
                className="border border-line bg-transparent px-3 py-2.5 text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-ink">
              Вес, кг
              <input
                type="number"
                name="weight_kg"
                min={20}
                max={300}
                step="0.1"
                required
                placeholder="60"
                className="border border-line bg-transparent px-3 py-2.5 text-ink outline-none focus:border-accent"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Телосложение
            <select
              name="body_type"
              required
              defaultValue=""
              className="border border-line bg-transparent px-3 py-2.5 text-ink outline-none focus:border-accent"
            >
              <option value="" disabled>
                Выбери вариант
              </option>
              {BODY_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-1.5 text-sm text-ink">
            <legend className="mb-1.5">Пол</legend>
            <div className="flex gap-2">
              {GENDERS.map((option) => (
                <label
                  key={option.value}
                  className="flex flex-1 cursor-pointer items-center justify-center border border-line px-3 py-2.5 text-ink-soft transition-colors has-[:checked]:border-accent has-[:checked]:text-ink"
                >
                  <input type="radio" name="gender" value={option.value} required className="sr-only" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="border-t border-line pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink">У меня нет фото в полный рост</span>
              <button
                type="button"
                role="switch"
                aria-checked={noPhoto}
                onClick={() => setNoPhoto((v) => !v)}
                className={
                  "relative h-6 w-11 shrink-0 border transition-colors " +
                  (noPhoto ? "border-accent bg-accent" : "border-line bg-transparent")
                }
              >
                <span
                  className={
                    "absolute top-0.5 h-4 w-4 bg-bone transition-transform " +
                    (noPhoto ? "translate-x-[22px]" : "translate-x-0.5")
                  }
                />
              </button>
            </div>

            {noPhoto ? (
              <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                Сгенерируем модель по описанию (рост/вес/телосложение/пол) через FASHN — это
                может занять пару минут при отправке формы.
              </p>
            ) : (
              <label className="mt-3 flex flex-col gap-1.5 text-sm text-ink">
                Фото в полный рост
                <input
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="border border-line bg-transparent px-3 py-2.5 text-sm text-ink-soft file:mr-3 file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-ink"
                />
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Предпросмотр фото"
                    className="mt-2 h-48 w-32 border border-line object-cover"
                  />
                )}
              </label>
            )}
          </div>

          {error && (
            <p className="border border-accent/40 bg-accent-soft px-3 py-2.5 text-sm text-ink">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="border border-accent bg-accent px-6 py-3 text-sm font-medium uppercase tracking-[0.1em] text-bone transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "generating"
              ? "Генерируем модель…"
              : status === "saving"
                ? "Сохраняем…"
                : "Сохранить и перейти к примерке"}
          </button>
        </form>
      </main>
    </div>
  );
}
