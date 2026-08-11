"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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

const AGE_RANGES = [
  { value: "18-25", label: "18–25" },
  { value: "26-35", label: "26–35" },
  { value: "36-45", label: "36–45" },
  { value: "45+", label: "45+" },
];

const SKIN_TONES = [
  { value: "fair", label: "Светлый", hex: "#f2d6bb" },
  { value: "light", label: "Светло-смуглый", hex: "#dfb38f" },
  { value: "medium", label: "Смуглый", hex: "#b98255" },
  { value: "deep", label: "Тёмный", hex: "#7a4a2b" },
];

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const POSES = [
  { value: "front", label: "Фас" },
  { value: "three-quarter", label: "Три четверти" },
  { value: "motion", label: "В движении" },
];

// Обёртка над radio/checkbox, спрятанным в sr-only — визуально это пилюля,
// подсвечивающаяся при выборе через :has(:checked). Общий паттерн для всех
// чипов на этой странице (пол/возраст/тон кожи/размер/поза).
function Chip({
  name,
  value,
  children,
  type = "radio",
}: {
  name: string;
  value: string;
  children: React.ReactNode;
  type?: "radio" | "checkbox";
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-ink-soft transition-colors has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
      <input type={type} name={name} value={value} className="sr-only" />
      {children}
    </label>
  );
}

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
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-8 pt-24 sm:px-6 sm:pb-12 sm:pt-28">
        <span className="eyebrow">Анкета</span>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Твоя мерка</h1>
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
                className="rounded-xl border border-line bg-transparent px-3.5 py-2.5 text-ink outline-none focus:border-ink"
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
                className="rounded-xl border border-line bg-transparent px-3.5 py-2.5 text-ink outline-none focus:border-ink"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Телосложение
            <select
              name="body_type"
              required
              defaultValue=""
              className="rounded-xl border border-line bg-transparent px-3.5 py-2.5 text-ink outline-none focus:border-ink"
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

          <fieldset className="flex flex-col gap-2 text-sm text-ink">
            <legend className="mb-0.5">Пол</legend>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((option) => (
                <Chip key={option.value} name="gender" value={option.value}>
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm font-medium text-ink">Дополнительно</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Точнее опишут тебя для примерки. Возраст, тон кожи и поза используются, если
              генерируем модель без фото — размер пригодится для рекомендаций по каталогу.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <fieldset className="flex flex-col gap-2 text-sm text-ink">
                <legend className="mb-0.5 text-xs text-ink-soft">Возраст</legend>
                <div className="flex flex-wrap gap-2">
                  {AGE_RANGES.map((option) => (
                    <Chip key={option.value} name="age_range" value={option.value}>
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-2 text-sm text-ink">
                <legend className="mb-0.5 text-xs text-ink-soft">Тон кожи</legend>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TONES.map((option) => (
                    <Chip key={option.value} name="skin_tone" value={option.value}>
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-ink/15"
                        style={{ backgroundColor: option.hex }}
                      />
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-2 text-sm text-ink">
                <legend className="mb-0.5 text-xs text-ink-soft">Размер одежды</legend>
                <div className="flex flex-wrap gap-2">
                  {CLOTHING_SIZES.map((size) => (
                    <Chip key={size} name="clothing_size" value={size}>
                      {size}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-2 text-sm text-ink">
                <legend className="mb-0.5 text-xs text-ink-soft">Поза модели</legend>
                <div className="flex flex-wrap gap-2">
                  {POSES.map((option) => (
                    <Chip key={option.value} name="pose" value={option.value}>
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          <div className="border-t border-line pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink">У меня нет фото в полный рост</span>
              <button
                type="button"
                role="switch"
                aria-checked={noPhoto}
                onClick={() => setNoPhoto((v) => !v)}
                className={
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
                  (noPhoto ? "bg-ink" : "bg-line")
                }
              >
                <span
                  className={
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform " +
                    (noPhoto ? "translate-x-[22px]" : "translate-x-0.5")
                  }
                />
              </button>
            </div>

            {noPhoto ? (
              <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                Сгенерируем модель по описанию (рост/вес/телосложение/пол + доп. параметры выше)
                через FASHN — это может занять пару минут при отправке формы.
              </p>
            ) : (
              <label className="mt-3 flex flex-col gap-1.5 text-sm text-ink">
                Фото в полный рост
                <input
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="rounded-xl border border-line bg-transparent px-3.5 py-2.5 text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-ink"
                />
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Предпросмотр фото"
                    className="mt-2 h-48 w-32 rounded-xl border border-line object-cover"
                  />
                )}
              </label>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-accent/40 bg-accent-soft px-3.5 py-2.5 text-sm text-ink">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
