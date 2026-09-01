"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
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
  { value: "0-18", label: "0–18" },
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

const FIELD =
  "border border-hair-ink bg-transparent px-3.5 py-2.5 font-grotesk text-sm text-ink outline-none transition-colors focus:border-clay";

const LEGEND = "mb-2 font-grotesk text-[10px] uppercase tracking-[0.24em] text-ink-soft";

// Обёртка над radio/checkbox, спрятанным в sr-only — визуально это плашка,
// подсвечивающаяся при выборе через :has(:checked). Общий паттерн для всех
// чипов на этой странице (пол/возраст/тон кожи/размер/поза).
function Chip({
  name,
  value,
  children,
  type = "radio",
  required,
}: {
  name: string;
  value: string;
  children: React.ReactNode;
  type?: "radio" | "checkbox";
  required?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-1.5 border border-hair-ink px-4 py-2 font-grotesk text-[12px] text-ink-soft transition-colors hover:border-ink has-[:checked]:border-clay has-[:checked]:bg-clay has-[:checked]:text-canvas">
      <input type={type} name={name} value={value} required={required} className="sr-only" />
      {children}
    </label>
  );
}

function ProfileForm() {
  const router = useRouter();
  // /tryon отправляет сюда ?model=generated, когда пользователь выбрал
  // "модель по анкете" — сразу включаем режим генерации, чтобы он не искал
  // переключатель в форме.
  const searchParams = useSearchParams();
  const [noPhoto, setNoPhoto] = useState(() => searchParams.get("model") === "generated");
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
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-10">
      {/* Выбор источника модели поднят в начало формы: раньше это был тумблер
          в самом низу, и про генерацию модели без фото никто не узнавал. */}
      <fieldset>
        <legend className={LEGEND}>Откуда взять модель</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setNoPhoto(false)}
            aria-pressed={!noPhoto}
            className={
              "border p-5 text-left transition-colors " +
              (!noPhoto ? "border-clay bg-clay/5" : "border-hair-ink hover:border-ink")
            }
          >
            <span className={"font-display text-2xl " + (!noPhoto ? "text-clay" : "text-ink-soft")}>01</span>
            <p className="mt-2 font-display text-lg uppercase tracking-tight text-ink">Своё фото</p>
            <p className="mt-1.5 font-grotesk text-[12px] leading-relaxed text-ink-soft">
              Снимок в полный рост. Результат максимально похож на тебя.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setNoPhoto(true)}
            aria-pressed={noPhoto}
            className={
              "border p-5 text-left transition-colors " +
              (noPhoto ? "border-clay bg-clay/5" : "border-hair-ink hover:border-ink")
            }
          >
            <span className={"font-display text-2xl " + (noPhoto ? "text-clay" : "text-ink-soft")}>02</span>
            <p className="mt-2 font-display text-lg uppercase tracking-tight text-ink">
              Модель по анкете
            </p>
            <p className="mt-1.5 font-grotesk text-[12px] leading-relaxed text-ink-soft">
              Фото не нужно — соберём женскую или мужскую модель по параметрам ниже.
            </p>
          </button>
        </div>

        {noPhoto ? (
          <p className="mt-4 border-l-2 border-clay bg-clay/5 px-4 py-3 font-grotesk text-[12px] leading-relaxed text-ink-soft">
            Модель сгенерирует FASHN по полу, росту, весу, телосложению, возрасту, тону
            кожи и позе. Займёт до пары минут при отправке формы.
          </p>
        ) : (
          <label className="mt-4 flex flex-col gap-2">
            <span className={LEGEND + " mb-0"}>Фото в полный рост</span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className={
                FIELD +
                " file:mr-3 file:border-0 file:bg-clay file:px-3 file:py-1.5 file:font-grotesk file:text-[11px] file:uppercase file:tracking-[0.14em] file:text-canvas"
              }
            />
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Предпросмотр фото"
                className="mt-1 h-48 w-36 object-cover ring-1 ring-hair-ink"
              />
            )}
          </label>
        )}
      </fieldset>

      <fieldset className="border-t border-hair-ink pt-8">
        <legend className={LEGEND}>Пол</legend>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((option) => (
            // required на первом radio группы — браузер сам не даст отправить
            // форму без выбора (раньше это ловил только zod на сервере).
            <Chip key={option.value} name="gender" value={option.value} required>
              {option.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className={LEGEND + " mb-0"}>Рост, см</span>
          <input type="number" name="height_cm" min={50} max={250} required placeholder="170" className={FIELD} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={LEGEND + " mb-0"}>Вес, кг</span>
          <input
            type="number"
            name="weight_kg"
            min={20}
            max={300}
            step="0.1"
            required
            placeholder="60"
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={LEGEND + " mb-0"}>Телосложение</span>
          <select name="body_type" required defaultValue="" className={FIELD}>
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
      </div>

      <div className="border-t border-hair-ink pt-8">
        <p className="font-display text-xl uppercase tracking-tight text-ink">Дополнительно</p>
        <p className="mt-2 max-w-lg font-grotesk text-[12px] leading-relaxed text-ink-soft">
          Возраст, тон кожи и поза идут в генерацию модели, размер — в рекомендации по
          каталогу. Всё необязательно, но чем точнее, тем ближе результат.
        </p>

        <div className="mt-6 flex flex-col gap-6">
          <fieldset>
            <legend className={LEGEND}>Возраст</legend>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGES.map((option) => (
                <Chip key={option.value} name="age_range" value={option.value}>
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={LEGEND}>Тон кожи</legend>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((option) => (
                <Chip key={option.value} name="skin_tone" value={option.value}>
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-ink/15"
                    style={{ backgroundColor: option.hex }}
                  />
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={LEGEND}>Размер одежды</legend>
            <div className="flex flex-wrap gap-2">
              {CLOTHING_SIZES.map((size) => (
                <Chip key={size} name="clothing_size" value={size}>
                  {size}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={LEGEND}>Поза модели</legend>
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

      {error && (
        <p className="border-l-2 border-clay bg-clay/5 px-4 py-3 font-grotesk text-sm text-ink">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="group relative self-start bg-clay px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-canvas transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="pointer-events-none absolute inset-0 translate-x-1.5 translate-y-1.5 border border-clay transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
        {status === "generating"
          ? "Генерируем модель…"
          : status === "saving"
            ? "Сохраняем…"
            : "Сохранить и примерить"}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="relative overflow-hidden border-b border-hair-ink bg-canvas-2 pb-14 pt-32 sm:pb-16 sm:pt-36">
        <div className="warp-lines pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative z-10 mx-auto flex w-full max-w-[88rem] flex-wrap items-end justify-between gap-6 px-5 sm:px-8 lg:px-14">
          <div>
            <span className="tag text-ink-soft">анкета</span>
            <h1 className="mt-5 font-display text-[clamp(2.25rem,6vw,4.5rem)] uppercase leading-[0.9] tracking-[-0.02em]">
              Твоя
              <br />
              <span className="stroke-clay">мерка</span>
            </h1>
          </div>
          <p className="max-w-xs font-grotesk text-[13px] leading-relaxed text-ink-soft">
            Заполняется один раз и остаётся в браузере — ни регистрации, ни пароля.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-20 sm:px-8">
        {/* useSearchParams требует Suspense-границы при пререндере */}
        <Suspense fallback={null}>
          <ProfileForm />
        </Suspense>
      </main>
    </div>
  );
}
