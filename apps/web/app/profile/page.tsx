"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import {
  PROFILE_STORAGE_KEY,
  useStoredProfile,
  type StoredProfile,
} from "@/lib/profileStorage";
import { getVisitorId } from "@/lib/analytics";
import { PageHeading } from "@/components/PageHeading";
import { DataConsent } from "@/components/DataConsent";
import { PRIVACY_VERSION } from "@/lib/privacy";
import { hasAnalyticsConsent } from "@/lib/privacyStorage";
import { safeTryonReturn } from "@/lib/catalogView";
import { GenerationNotice } from "@/components/GenerationNotice";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  ImageUp,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// Тип фигуры (силуэт) — отдельно от телосложения. Значения совпадают с
// FIGURE_PHRASES в lib/gemini.ts и FIGURE_PROMPT_HINTS в lib/fashn.ts.
const FIGURE_TYPES = [
  { value: "hourglass", label: "Песочные часы" },
  { value: "pear", label: "Груша" },
  { value: "apple", label: "Яблоко" },
  { value: "rectangle", label: "Прямоугольник" },
  { value: "inverted-triangle", label: "Перевёрнутый треугольник" },
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

const FIELD = "field";

const LEGEND = "field-label";

// Обёртка над radio/checkbox, спрятанным в sr-only — визуально это плашка,
// подсвечивающаяся при выборе через :has(:checked). Общий паттерн для всех
// чипов на этой странице (пол/возраст/тон кожи/размер/поза).
function Chip({
  name,
  value,
  children,
  type = "radio",
  required,
  defaultChecked,
}: {
  name: string;
  value: string;
  children: React.ReactNode;
  type?: "radio" | "checkbox";
  required?: boolean;
  defaultChecked?: boolean;
}) {
  return (
    <label className="chip">
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      {children}
    </label>
  );
}

function ProfileForm({
  initialProfile,
}: {
  initialProfile: StoredProfile | null;
}) {
  const router = useRouter();
  // /tryon отправляет сюда ?model=generated, когда пользователь выбрал
  // "модель по анкете" — сразу включаем режим генерации, чтобы он не искал
  // переключатель в форме.
  const searchParams = useSearchParams();
  const [noPhoto, setNoPhoto] = useState(
    () => searchParams.get("model") === "generated",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "generating">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file?.name ?? null);
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (
      ![/^image\/jpeg$/, /^image\/png$/, /^image\/webp$/].some((pattern) =>
        pattern.test(file.type),
      ) ||
      file.size > 4 * 1024 * 1024
    ) {
      setError("Выбери JPEG, PNG или WebP размером до 4 МБ");
      e.target.value = "";
      setFileName(null);
      setPreviewUrl(null);
      return;
    }
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("data_consent_version", PRIVACY_VERSION);
    if (hasAnalyticsConsent())
      formData.set("analytics_consent_version", PRIVACY_VERSION);
    if (initialProfile?.photoPath)
      formData.set("reuse_profile_id", initialProfile.id);
    if (noPhoto) {
      formData.delete("photo");
      formData.set("no_photo", "true");
    } else {
      formData.delete("no_photo");
    }

    // Связывает анкету с воронкой в админ-статистике (lib/analytics.ts).
    formData.set("visitor_id", getVisitorId());

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
      router.push(safeTryonReturn(searchParams.get("returnTo")));
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "Не дождались ответа от FASHN — попробуй ещё раз"
          : "Не удалось связаться с сервером",
      );
      setStatus("idle");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const busy = status !== "idle";

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-10 sm:mt-14">
      <GenerationNotice />
      <fieldset disabled={busy} className="contents">
        {/* Выбор источника модели поднят в начало формы: раньше это был тумблер
          в самом низу, и про генерацию модели без фото никто не узнавал. */}
        <fieldset>
          <legend className={LEGEND}>Откуда взять модель</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                value: false,
                icon: Camera,
                title: "Своё фото",
                text: "Снимок в полный рост. Результат максимально похож на тебя.",
              },
              {
                value: true,
                icon: UserRound,
                title: "Модель по анкете",
                text: "Фото не нужно — соберём женскую или мужскую модель по параметрам ниже.",
              },
            ].map(({ value, icon: Icon, title, text }) => {
              const active = noPhoto === value;
              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => setNoPhoto(value)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex gap-4 rounded-2xl border p-5 text-left transition-[border-color,background-color,box-shadow] duration-200",
                    active
                      ? "border-clay bg-clay-soft/40 shadow-soft"
                      : "border-hair-ink bg-surface hover:border-ink/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
                      active ? "bg-clay text-canvas" : "bg-canvas-2 text-ink",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-xl leading-tight">
                      {title}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-ink-soft">
                      {text}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-4 top-4 flex size-5 items-center justify-center rounded-full border transition-colors",
                      active
                        ? "border-clay bg-clay text-canvas"
                        : "border-hair-ink",
                    )}
                  >
                    {active && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>

          {noPhoto ? (
            <p className="mt-4 rounded-2xl bg-canvas-2/70 px-4 py-3.5 text-sm leading-relaxed text-ink-soft">
              Модель сгенерирует FASHN по полу, росту, весу, телосложению,
              возрасту, тону кожи и позе. Займёт до пары минут при отправке
              формы.
            </p>
          ) : (
            <label className="mt-5 flex flex-col">
              <span className={LEGEND}>Фото в полный рост</span>
              <span className="flex cursor-pointer flex-col gap-4 rounded-2xl border border-dashed border-ink/25 bg-surface p-4 transition-colors hover:border-clay has-[:focus-visible]:border-clay has-[:focus-visible]:shadow-[0_0_0_3px_rgba(169,72,45,0.14)] sm:flex-row sm:items-center">
                {previewUrl || initialProfile?.photoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl ?? initialProfile!.photoPath!}
                    alt="Предпросмотр фото"
                    className="h-40 w-30 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-40 w-30 shrink-0 items-center justify-center rounded-xl bg-canvas-2">
                    <ImageUp className="size-7 text-ink-soft" strokeWidth={1.4} />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col items-start gap-3">
                  <span className="text-sm text-ink-soft">
                    JPEG, PNG или WebP до 4 МБ. Лучше всего — ровный свет и
                    поза в полный рост.
                  </span>
                  {/* Нативная кнопка выбора файла подписана языком браузера
                      («Choose File») — прячем её и рисуем свою. */}
                  <input
                    required={!initialProfile?.photoPath}
                    type="file"
                    name="photo"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                  <span className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
                    <span className="button-dark button-sm pointer-events-none">
                      <ImageUp className="size-4" strokeWidth={1.75} />
                      {previewUrl || initialProfile?.photoPath
                        ? "Выбрать другое фото"
                        : "Выбрать фото"}
                    </span>
                    <span className="min-w-0 truncate text-sm text-ink-soft">
                      {fileName ??
                        (initialProfile?.photoPath
                          ? "Текущее фото"
                          : "Файл не выбран")}
                    </span>
                  </span>
                </span>
              </span>
            </label>
          )}
        </fieldset>

        {initialProfile?.photoPath && !noPhoto && (
          <p className="-mt-6 text-[13px] text-ink-soft">
            Сохраним текущее фото, если ты не выберешь другое. Форматы: JPEG,
            PNG, WebP, до 4 МБ.
          </p>
        )}
        <div className="-mb-4 border-t border-hair-ink pt-8">
          <p className="font-display text-2xl text-ink">Основное</p>
        </div>
        <fieldset>
          <legend className={LEGEND}>Пол</legend>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((option) => (
              // required на первом radio группы — браузер сам не даст отправить
              // форму без выбора (раньше это ловил только zod на сервере).
              <Chip
                key={option.value}
                name="gender"
                value={option.value}
                defaultChecked={initialProfile?.gender === option.value}
                required
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-3">
          <label className="flex flex-col">
            <span className={LEGEND}>Рост, см</span>
            <input
              type="number"
              name="height_cm"
              min={50}
              max={250}
              defaultValue={initialProfile?.heightCm}
              required
              placeholder="170"
              className={FIELD}
            />
          </label>
          <label className="flex flex-col">
            <span className={LEGEND}>Вес, кг</span>
            <input
              type="number"
              name="weight_kg"
              min={20}
              max={300}
              step="0.1"
              required
              defaultValue={initialProfile?.weightKg}
              placeholder="60"
              className={FIELD}
            />
          </label>
          <label className="flex flex-col">
            <span className={LEGEND}>Телосложение</span>
            <select
              name="body_type"
              required
              defaultValue={initialProfile?.bodyType ?? ""}
              className={FIELD}
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
        </div>

        <div className="border-t border-hair-ink pt-8">
          <p className="font-display text-2xl text-ink">
            Дополнительно{" "}
            <span className="font-sans text-sm text-ink-soft">
              · необязательно
            </span>
          </p>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
            Тип фигуры, возраст, тон кожи и поза идут в генерацию модели и
            примерку, размер — в рекомендации по каталогу. Всё необязательно, но
            чем точнее, тем ближе результат.
          </p>

          <div className="mt-7 flex flex-col gap-7">
            <fieldset>
              <legend className={LEGEND}>Тип фигуры</legend>
              <div className="flex flex-wrap gap-2">
                {FIGURE_TYPES.map((option) => (
                  <Chip
                    key={option.value}
                    name="figure_type"
                    value={option.value}
                    defaultChecked={initialProfile?.figureType === option.value}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={LEGEND}>Возраст</legend>
              <div className="flex flex-wrap gap-2">
                {AGE_RANGES.map((option) => (
                  <Chip
                    key={option.value}
                    name="age_range"
                    value={option.value}
                    defaultChecked={initialProfile?.ageRange === option.value}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={LEGEND}>Тон кожи</legend>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONES.map((option) => (
                  <Chip
                    key={option.value}
                    name="skin_tone"
                    value={option.value}
                    defaultChecked={initialProfile?.skinTone === option.value}
                  >
                    <span
                      className="size-4 shrink-0 rounded-full ring-1 ring-ink/15"
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
                  <Chip
                    key={size}
                    name="clothing_size"
                    value={size}
                    defaultChecked={initialProfile?.clothingSize === size}
                  >
                    {size}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={LEGEND}>Поза модели</legend>
              <div className="flex flex-wrap gap-2">
                {POSES.map((option) => (
                  <Chip
                    key={option.value}
                    name="pose"
                    value={option.value}
                    defaultChecked={initialProfile?.pose === option.value}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <DataConsent />
      </fieldset>
      {busy && (
        <p
          role="status"
          className="flex items-start gap-3 rounded-2xl bg-canvas-2/80 p-4 text-[15px] leading-relaxed text-ink-soft"
        >
          <span className="mt-1 size-4 shrink-0 animate-spin rounded-full border-2 border-clay/30 border-t-clay" />
          {status === "generating"
            ? "Создаём модель по твоей анкете. Обычно это занимает до двух минут. Дождись завершения на этой странице."
            : "Сохраняем твою анкету…"}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-clay/30 bg-clay-soft/50 px-4 py-3.5 text-[15px] text-ink"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-clay" strokeWidth={1.75} />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="button-primary button-lg w-full sm:w-auto sm:self-start"
      >
        {status === "generating"
          ? "Генерируем модель…"
          : status === "saving"
            ? "Сохраняем…"
            : "Сохранить и примерить"}
        {!busy && <ArrowRight className="size-4" />}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const savedProfile = useStoredProfile();
  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <PageHeading
        label="Анкета"
        title={
          <>
            Начнём <span className="headline-accent">с тебя.</span>
          </>
        }
        description="Твоё фото или модель по параметрам — выбери удобный способ. Анкета сохранится в этом браузере."
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-20 sm:px-8">
        {/* useSearchParams требует Suspense-границы при пререндере */}
        <Suspense fallback={null}>
          <ProfileForm
            key={savedProfile?.id ?? "new"}
            initialProfile={savedProfile}
          />
        </Suspense>
      </main>
    </div>
  );
}
