"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Camera,
  Check,
  Download,
  Sparkles,
  UserRound,
} from "lucide-react";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { useStoredProfile, type StoredProfile } from "@/lib/profileStorage";
import { DataConsent } from "@/components/DataConsent";
import { PRIVACY_VERSION } from "@/lib/privacy";
import { hasAnalyticsConsent } from "@/lib/privacyStorage";
import { ITEM_FORMS, cn, pluralRu } from "@/lib/utils";
import { GenerationNotice } from "@/components/GenerationNotice";
import { Carousel } from "@/components/tryon/Carousel";
import { getVisitorId, track } from "@/lib/analytics";

// Клиентский предохранитель: если сервер вообще не ответит, не виснем
// бесконечно. Примерка — один вызов Gemini в 1K (обычно ~15–40 сек, см.
// lib/gemini.ts). Держим запас на холодный старт serverless-функции и один
// авто-ретрай на стороне сервера (до ~3 мин в худшем случае).
const CLIENT_TIMEOUT_MS = 4 * 60 * 1000;

interface Item {
  id: string;
  category: string;
  color: string | null;
  description: string | null;
  imagePath: string;
  lookId: string;
}

// Полный образ (комплект) — все вещи одного look_id по слотам. Примеряется
// целиком за один вызов Gemini (верхняя одежда надевается ПОВЕРХ верха).
interface LookItem {
  id: string;
  category: string;
  color: string | null;
  description: string | null;
  imagePath: string;
}

interface Look {
  lookId: string;
  cover: string; // /catalog/looks/<lookId>.jpg — модель в полном образе
  fallbackImage: string; // фото одной вещи образа — если обложки нет
  outerwearId?: string;
  topId?: string;
  bottomId?: string;
  shoesId?: string;
  bagId?: string;
  itemCount: number;
  items: LookItem[]; // вещи образа по слотам — состав комплекта
}

function itemsPlural(n: number): string {
  return pluralRu(n, ITEM_FORMS);
}

// Отметка выбора поверх карточки: галочка в круге вместо плашки «выбрано»,
// которая перекрывала низ фото мелким капсом.
function SelectedMark() {
  return (
    <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-clay text-canvas shadow-soft animate-fade-in">
      <Check className="size-4" strokeWidth={2.5} />
    </span>
  );
}

// Заголовок блока внутри примерочной — одна стилистика для всех лент.
function BlockTitle({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <h2 className="flex items-baseline gap-2 border-b border-hair-ink pb-3 font-display text-xl">
      {children}
      {count !== undefined && (
        <span className="font-sans text-[13px] tabular-nums text-ink-soft">
          {count}
        </span>
      )}
    </h2>
  );
}

interface TryonResult {
  id: string;
  resultImagePath: string;
  createdAt: string;
}

function ItemThumb({
  item,
  selected,
  onClick,
}: {
  item: Item;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="group w-28 shrink-0 text-left sm:w-32"
    >
      <div
        className={
          "media-well aspect-[3/4] rounded-xl transition-shadow duration-200 " +
          (selected
            ? "ring-2 ring-clay ring-offset-2 ring-offset-canvas"
            : "ring-1 ring-inset ring-hair-ink group-hover:ring-ink/40")
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={catalogImageUrl(item.imagePath)}
          alt={item.description ?? item.category}
          loading="lazy"
          className="media-product absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        {selected && <SelectedMark />}
      </div>
      <p
        className={
          "mt-2 line-clamp-2 text-[13px] leading-snug transition-colors first-letter:uppercase " +
          (selected ? "text-ink" : "text-ink-soft group-hover:text-ink")
        }
      >
        {item.description ?? CATEGORY_LABELS[item.category as CatalogCategory]}
      </p>
    </button>
  );
}

// Карточка готового образа: обложка (модель в полном комплекте) с откатом на
// фото одной вещи, если обложки нет.
function LookCardButton({
  look,
  selected,
  onClick,
}: {
  look: Look;
  selected: boolean;
  onClick: () => void;
}) {
  const [src, setSrc] = useState(look.cover);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="group text-left"
    >
      <div
        className={
          "relative aspect-[3/4] overflow-hidden rounded-2xl bg-media transition-shadow duration-200 " +
          (selected
            ? "ring-2 ring-clay ring-offset-2 ring-offset-canvas"
            : "group-hover:shadow-soft")
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          onError={() =>
            setSrc((cur) =>
              cur === look.fallbackImage ? cur : look.fallbackImage,
            )
          }
          alt={`Готовый образ ${look.lookId}`}
          loading="lazy"
          className="h-full w-full scale-[1.04] object-cover object-[50%_35%] transition-transform duration-500 group-hover:scale-[1.08]"
        />
        <span className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
          {itemsPlural(look.itemCount)}
        </span>
        {selected && <SelectedMark />}
      </div>
    </button>
  );
}

const AGE_RANGE_LABELS: Record<string, string> = {
  "0-18": "0–18 лет",
  "18-25": "18–25 лет",
  "26-35": "26–35 лет",
  "36-45": "36–45 лет",
  "45+": "45+ лет",
};

const SKIN_TONE_LABELS: Record<string, string> = {
  fair: "Светлый тон",
  light: "Светло-смуглый",
  medium: "Смуглый",
  deep: "Тёмный тон",
};

const POSE_LABELS: Record<string, string> = {
  front: "Фас",
  "three-quarter": "Три четверти",
  motion: "В движении",
};

function ProfileSummary({
  profile,
  editHref,
}: {
  profile: StoredProfile;
  editHref: string;
}) {
  const badges = [
    `${profile.heightCm} см`,
    `${profile.weightKg} кг`,
    profile.ageRange
      ? (AGE_RANGE_LABELS[profile.ageRange] ?? profile.ageRange)
      : null,
    profile.skinTone
      ? (SKIN_TONE_LABELS[profile.skinTone] ?? profile.skinTone)
      : null,
    profile.clothingSize ? `Размер ${profile.clothingSize}` : null,
    profile.pose ? (POSE_LABELS[profile.pose] ?? profile.pose) : null,
  ].filter((b): b is string => Boolean(b));

  // photoPath заполняется и загруженным фото, и сгенерированной моделью
  // (см. app/api/profile) — здесь показываем, на чём именно будет примерка,
  // чтобы это не было чёрным ящиком.
  return (
    <div className="panel flex flex-wrap items-center gap-x-3 gap-y-2.5 p-3 pr-4 sm:rounded-full sm:p-2 sm:pr-3">
      <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-media sm:size-12 sm:rounded-full">
        {profile.photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photoPath}
            alt="Модель для примерки"
            className="h-full w-full object-cover"
          />
        ) : null}
      </span>
      <span className="mr-1 text-sm font-medium">Твоя модель</span>
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded-full bg-canvas-2/80 px-3 py-1.5 text-[13px] text-ink-soft"
        >
          {badge}
        </span>
      ))}
      <Link
        href={editHref}
        className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-clay transition-colors hover:bg-clay/5"
      >
        Изменить анкету <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}

function ResultImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-canvas-2 px-2 text-center text-[13px] text-ink-soft">
        Не удалось загрузить изображение
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

// Панель с кнопкой примерки прилипает к низу экрана, пока над ней листаются
// ленты вещей: раньше до кнопки приходилось прокручивать через все ленты.
function TryBar({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-3 z-20 flex flex-col gap-2 rounded-3xl border border-hair-ink bg-surface/92 p-2 shadow-lift backdrop-blur-md sm:bottom-5 sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:pl-6">
      <p className="hidden text-sm text-ink-soft sm:block" aria-live="polite">
        {summary}
      </p>
      {children}
    </div>
  );
}

export function TryonForm({
  tops,
  bottoms,
  shoes,
  bags,
  looks,
}: {
  tops: Item[];
  bottoms: Item[];
  shoes: Item[];
  bags: Item[];
  looks: Look[];
}) {
  const profile = useStoredProfile();
  const searchParams = useSearchParams();
  const returnTo = `/tryon${searchParams.size ? `?${searchParams}` : ""}`;
  const profileHref = `/profile?returnTo=${encodeURIComponent(returnTo)}`;
  const [dataConsent, setDataConsent] = useState(false);
  const consentAccepted =
    profile?.dataConsentVersion === PRIVACY_VERSION || dataConsent;
  const [outerwearId, setOuterwearId] = useState<string | null>(() =>
    searchParams.get("outerwear"),
  );
  // Примерочная (см. app/fitting-room) может передать сюда предвыбор через
  // ?top=/?bottom= — читаем один раз при монтировании.
  const [topId, setTopId] = useState<string | null>(() =>
    searchParams.get("top"),
  );
  const [bottomId, setBottomId] = useState<string | null>(() =>
    searchParams.get("bottom"),
  );
  const [shoesId, setShoesId] = useState<string | null>(() =>
    searchParams.get("shoes"),
  );
  const [bagId, setBagId] = useState<string | null>(() =>
    searchParams.get("bag"),
  );
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TryonResult | null>(null);
  const [matches, setMatches] = useState<Item[]>([]);
  const [history, setHistory] = useState<TryonResult[] | null>(null);
  // Остаток суточного лимита примерок (профиль + IP, считается на сервере,
  // см. lib/tryonLimit.ts). null — ещё не загрузили.
  const [usage, setUsage] = useState<{
    limit: number;
    remaining: number;
  } | null>(null);
  // Режим примерки: «полный образ» (комплект целиком) или «по частям».
  // Если пришли из примерочной с предвыбором вещей — сразу «по частям».
  const hasPreselect = Boolean(
    searchParams.get("outerwear") ||
      searchParams.get("top") ||
      searchParams.get("bottom") ||
      searchParams.get("shoes") ||
      searchParams.get("bag"),
  );
  const [mode, setMode] = useState<"full" | "pieces">(
    hasPreselect || looks.length === 0 ? "pieces" : "full",
  );
  const [selectedLookId, setSelectedLookId] = useState<string | null>(() =>
    looks.some((look) => look.lookId === searchParams.get("look"))
      ? searchParams.get("look")
      : null,
  );

  // Пришёл из примерочной/каталога с уже выбранными вещами — это тоже шаг
  // воронки «выбрал образ».
  useEffect(() => {
    if (hasPreselect || searchParams.get("look"))
      track("look_selected", { lookId: searchParams.get("look") });
  }, [hasPreselect, searchParams]);

  // Якорь для рекомендаций "Дополните образ" — первая выбранная вещь любой
  // категории. Пока ничего не выбрано (свежий заход без предвыбора), anchor
  // остаётся null — и блок ниже явно показывает подсказку вместо того, чтобы
  // тихо пропасть (это и была причина жалобы "не работает" — см. план).
  const anchorId = topId ?? outerwearId ?? bottomId ?? shoesId ?? bagId;

  useEffect(() => {
    let cancelled = false;
    const request = anchorId
      ? fetch(`/api/catalog/${anchorId}/matches`)
          .then((res) => res.json())
          .then((data) => data.items ?? [])
      : Promise.resolve([]);

    request
      .then((items) => {
        if (!cancelled) setMatches(items);
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      });

    return () => {
      cancelled = true;
    };
  }, [anchorId]);

  useEffect(() => {
    let cancelled = false;
    const request = profile
      ? fetch(`/api/tryon/history?userId=${profile.id}`).then((res) =>
          res.json(),
        )
      : Promise.resolve(null);

    request
      .then((data) => {
        if (cancelled) return;
        setHistory(data ? (data.items ?? []) : null);
        if (data?.usage) setUsage(data.usage);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, [profile]);

  const selectedIds = new Set(
    [outerwearId, topId, bottomId, shoesId, bagId].filter(Boolean),
  );
  const visibleMatches = matches.filter((item) => !selectedIds.has(item.id));
  const selectedCount = selectedIds.size;

  const selectedLook = looks.find((l) => l.lookId === selectedLookId) ?? null;
  const currentSelection = new URLSearchParams();
  if (mode === "full" && selectedLook)
    currentSelection.set("look", selectedLook.lookId);
  else
    for (const [slot, id] of Object.entries({
      outerwear: outerwearId,
      top: topId,
      bottom: bottomId,
      shoes: shoesId,
      bag: bagId,
    })) {
      if (id) currentSelection.set(slot, id);
    }
  const editHref = `/profile?returnTo=${encodeURIComponent(`/tryon${currentSelection.size ? `?${currentSelection}` : ""}`)}`;

  // Суточный лимит исчерпан — блокируем кнопки примерки (сервер всё равно
  // вернёт 429, но так пользователь видит причину сразу).
  const limitReached = usage !== null && usage.remaining <= 0;

  function toggleTop(id: string) {
    if (tops.find((item) => item.id === id)?.category === "outerwear")
      setOuterwearId(null);
    track("look_selected");
    setTopId((current) => (current === id ? null : id));
    setResult(null);
  }

  function toggleBottom(id: string) {
    track("look_selected");
    setBottomId((current) => (current === id ? null : id));
    setResult(null);
  }

  function toggleShoes(id: string) {
    track("look_selected");
    setShoesId((current) => (current === id ? null : id));
    setResult(null);
  }

  function toggleBag(id: string) {
    track("look_selected");
    setBagId((current) => (current === id ? null : id));
    setResult(null);
  }

  // Общий вызов примерки. payload — набор *ItemId (верх/низ/обувь/сумка +
  // outerwearItemId для полного образа); userId дописывается здесь.
  async function runTryOn(payload: Record<string, string | null | undefined>) {
    if (!profile || !consentAccepted) return;
    setStatus("loading");
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          visitorId: getVisitorId(),
          dataConsentVersion: PRIVACY_VERSION,
          analyticsConsentVersion: hasAnalyticsConsent()
            ? PRIVACY_VERSION
            : null,
          ...payload,
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      // Сервер возвращает актуальный остаток лимита и при успехе, и при 429 —
      // синхронизируем счётчик в любом случае.
      if (data.usage) setUsage(data.usage);
      if (!response.ok) {
        setError(data.message ?? "Не удалось выполнить примерку");
        setStatus("idle");
        return;
      }
      const newResult: TryonResult = data.result;
      setResult(newResult);
      setHistory((prev) => (prev ? [newResult, ...prev] : [newResult]));
      setStatus("idle");
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "Не дождались ответа от нейросети — попробуй ещё раз"
          : "Не удалось связаться с сервером",
      );
      setStatus("idle");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function handleTryOn() {
    if (!outerwearId && !topId && !bottomId && !shoesId && !bagId) return;
    runTryOn({
      outerwearItemId: outerwearId,
      topItemId: topId,
      bottomItemId: bottomId,
      shoesItemId: shoesId,
      bagItemId: bagId,
    });
  }

  function handleTryOnLook() {
    if (!selectedLook) return;
    runTryOn({
      lookId: selectedLook.lookId,
      outerwearItemId: selectedLook.outerwearId,
      topItemId: selectedLook.topId,
      bottomItemId: selectedLook.bottomId,
      shoesItemId: selectedLook.shoesId,
      bagItemId: selectedLook.bagId,
    });
  }

  // Без анкеты примерять не на что. Раньше здесь был один абзац, из которого
  // невозможно было понять, что фото вообще необязательно — генерация модели
  // была спрятана тумблером в самом низу анкеты. Теперь это явная развилка
  // из двух равноправных путей.
  if (!profile) {
    return (
      <div className="animate-fade-in-up">
        <h2 className="font-display text-3xl leading-tight sm:text-4xl">
          На ком <span className="accent-italic">примеряем?</span>
        </h2>
        <p className="lead mt-3 max-w-xl">
          Для примерки нужна модель — фигура, на которую нейросеть наденет
          образ. Выбери, откуда её взять:
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            {
              href: profileHref,
              icon: Camera,
              title: "Своё фото",
              text: "Снимок в полный рост — результат будет максимально похож на тебя.",
              cta: "Загрузить фото",
              accent: false,
            },
            {
              href: `${profileHref}&model=generated`,
              icon: UserRound,
              title: "Модель по анкете",
              text: "Фото не нужно. Соберём женскую или мужскую модель по росту, весу, телосложению, тону кожи и позе.",
              cta: "Заполнить анкету",
              accent: true,
            },
          ].map(({ href, icon: Icon, title, text, cta, accent }) => (
            <Link
              key={title}
              href={href}
              className={cn(
                "group relative flex flex-col rounded-3xl border p-7 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-8",
                accent
                  ? "border-clay/40 bg-clay-soft/50 hover:border-clay"
                  : "border-hair-ink bg-surface hover:border-ink/40",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-full",
                    accent ? "bg-clay text-canvas" : "bg-canvas-2 text-ink",
                  )}
                >
                  <Icon className="size-6" strokeWidth={1.5} />
                </span>
                {accent && (
                  <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-clay">
                    Без фото
                  </span>
                )}
              </div>
              <h3 className="mt-8 font-display text-[1.75rem] leading-tight">
                {title}
              </h3>
              <p className="mt-2 max-w-sm text-pretty text-[15px] leading-relaxed text-ink-soft">
                {text}
              </p>
              <span className="mt-8 inline-flex items-center gap-2 text-[15px] font-medium text-clay">
                {cta}
                <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ol
        aria-label="Этапы примерки"
        className="grid grid-cols-3 gap-2 text-[13px] sm:gap-4 sm:text-sm"
      >
        {["Твоя модель", "Твой образ", "Результат"].map((label, index) => {
          const current = result ? 2 : 1;
          const done = index < current;
          const active = index === current;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className="flex flex-col gap-3"
            >
              <span
                aria-hidden
                className={cn(
                  "h-1 rounded-full transition-colors duration-300",
                  done || active ? "bg-clay" : "bg-hair-ink",
                )}
              />
              <span
                className={cn(
                  "flex items-center gap-2",
                  active ? "font-medium text-ink" : "text-ink-soft",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums",
                    done
                      ? "bg-clay text-canvas"
                      : active
                        ? "border border-clay text-clay"
                        : "border border-hair-ink",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={2.5} /> : index + 1}
                </span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <GenerationNotice />
      {profile.dataConsentVersion !== PRIVACY_VERSION && (
        <DataConsent checked={dataConsent} onChange={setDataConsent} />
      )}
      <ProfileSummary profile={profile} editHref={editHref} />

      {looks.length > 0 && (
        <div className="segmented self-start" role="group" aria-label="Режим примерки">
          {(
            [
              ["full", "Полный образ"],
              ["pieces", "Собрать по частям"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setResult(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {looks.length > 0 && mode === "full" ? (
        <section className="flex flex-col gap-6">
          <div>
            <BlockTitle count={looks.length}>Готовые образы</BlockTitle>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              Выбери образ целиком — нейросеть наденет на тебя все вещи
              комплекта за один раз: верх, верхнюю одежду, низ, обувь и сумку.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {looks.map((look) => (
              <LookCardButton
                key={look.lookId}
                look={look}
                selected={selectedLookId === look.lookId}
                onClick={() => {
                  setSelectedLookId(look.lookId);
                  track("look_selected", { lookId: look.lookId });
                  setResult(null);
                }}
              />
            ))}
          </div>

          {selectedLook && (
            <div className="panel animate-fade-in-up p-5 sm:p-6">
              <h3 className="font-display text-xl">
                Что в образе{" "}
                <span className="font-sans text-[13px] text-ink-soft">
                  {itemsPlural(selectedLook.items.length)}
                </span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Нажми на любую вещь, чтобы открыть её карточку и рассмотреть
                отдельно.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {selectedLook.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/catalog/${item.id}`}
                    className="group text-left"
                  >
                    <div className="media-well aspect-[3/4] rounded-xl ring-1 ring-transparent transition-shadow group-hover:ring-clay">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={catalogImageUrl(item.imagePath)}
                        alt={item.description ?? item.category}
                        loading="lazy"
                        className="media-product absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                      {CATEGORY_LABELS[item.category as CatalogCategory] ??
                        item.category}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink transition-colors first-letter:uppercase group-hover:text-clay">
                      {item.description ??
                        CATEGORY_LABELS[item.category as CatalogCategory] ??
                        item.category}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <TryBar
            summary={
              selectedLook
                ? `Выбран образ · ${itemsPlural(selectedLook.itemCount)}`
                : "Образ ещё не выбран"
            }
          >
          <button
            type="button"
            onClick={handleTryOnLook}
            disabled={
              !selectedLook ||
              status === "loading" ||
              limitReached ||
              !consentAccepted
            }
            className="button-primary w-full sm:w-auto"
          >
            {status === "loading" ? (
              <span className="size-4 animate-spin rounded-full border-2 border-canvas/40 border-t-canvas" />
            ) : (
              <Sparkles className="size-4" strokeWidth={1.75} />
            )}
            {status === "loading"
              ? "Примеряем образ… обычно 15–40 сек"
              : limitReached
                ? "Лимит на сегодня исчерпан"
                : selectedLook
                  ? `Примерить образ · ${itemsPlural(selectedLook.itemCount)}`
                  : "Выбери образ выше"}
          </button>
          </TryBar>
        </section>
      ) : (
        <>
          {outerwearId && (
            <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3 text-[15px]">
              <span>
                Второй слой:{" "}
                {tops.find((item) => item.id === outerwearId)?.description ??
                  "верхняя одежда"}
              </span>
              <button
                type="button"
                onClick={() => setOuterwearId(null)}
                className="inline-flex min-h-10 items-center text-sm font-medium text-clay underline underline-offset-4"
              >
                Убрать второй слой
              </button>
            </div>
          )}
          <Carousel title="Верх" count={tops.length}>
            {tops.map((item) => (
              <ItemThumb
                key={item.id}
                item={item}
                selected={topId === item.id}
                onClick={() => toggleTop(item.id)}
              />
            ))}
          </Carousel>

          <Carousel title="Низ" count={bottoms.length}>
            {bottoms.map((item) => (
              <ItemThumb
                key={item.id}
                item={item}
                selected={bottomId === item.id}
                onClick={() => toggleBottom(item.id)}
              />
            ))}
          </Carousel>

          {shoes.length > 0 && (
            <Carousel title="Обувь" count={shoes.length}>
              {shoes.map((item) => (
                <ItemThumb
                  key={item.id}
                  item={item}
                  selected={shoesId === item.id}
                  onClick={() => toggleShoes(item.id)}
                />
              ))}
            </Carousel>
          )}

          {bags.length > 0 && (
            <Carousel title="Сумки" count={bags.length}>
              {bags.map((item) => (
                <ItemThumb
                  key={item.id}
                  item={item}
                  selected={bagId === item.id}
                  onClick={() => toggleBag(item.id)}
                />
              ))}
            </Carousel>
          )}

          {!anchorId || visibleMatches.length === 0 ? (
            <section>
              <BlockTitle>Дополните образ</BlockTitle>
              <p className="mt-4 text-[15px] text-ink-soft">
                {!anchorId
                  ? "Выбери вещь выше, чтобы увидеть, что к ней подходит."
                  : "Пока нечего предложить к этому выбору."}
              </p>
            </section>
          ) : (
            <Carousel title="Дополните образ" count={visibleMatches.length}>
              {visibleMatches.map((item) => (
                <Link
                  key={item.id}
                  href={`/catalog/${item.id}`}
                  className="group w-28 shrink-0 sm:w-32"
                >
                  <div className="media-well aspect-[3/4] rounded-xl ring-1 ring-hair-ink transition-shadow group-hover:ring-clay">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={catalogImageUrl(item.imagePath)}
                      alt={item.description ?? item.category}
                      loading="lazy"
                      className="media-product absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                    {CATEGORY_LABELS[item.category as CatalogCategory] ??
                      item.category}
                  </p>
                </Link>
              ))}
            </Carousel>
          )}

          <TryBar
            summary={
              selectedCount > 0
                ? `Выбрано: ${itemsPlural(selectedCount)}`
                : "Пока ничего не выбрано"
            }
          >
            <button
              type="button"
              onClick={handleTryOn}
              disabled={
                selectedCount === 0 ||
                status === "loading" ||
                limitReached ||
                !consentAccepted
              }
              className="button-primary w-full sm:w-auto"
            >
              {status === "loading" ? (
                <span className="size-4 animate-spin rounded-full border-2 border-canvas/40 border-t-canvas" />
              ) : (
                <Sparkles className="size-4" strokeWidth={1.75} />
              )}
              {status === "loading"
                ? "Примеряем… обычно 15–40 сек"
                : limitReached
                  ? "Лимит на сегодня исчерпан"
                  : `Примерить${selectedCount > 0 ? ` · ${selectedCount}` : ""}`}
            </button>
          </TryBar>
        </>
      )}

      {usage && (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              usage.remaining > 0 ? "bg-sage" : "bg-clay",
            )}
          />
          {usage.remaining > 0
            ? `Осталось примерок сегодня: ${usage.remaining} из ${usage.limit}`
            : `Лимит на сегодня исчерпан · ${usage.limit} в день · обновится завтра`}
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

      {status === "loading" && (
        <section
          role="status"
          aria-live="polite"
          className="flex flex-col gap-4"
        >
          <BlockTitle>Результат</BlockTitle>
          <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Создаём твой образ. Обычно это занимает 15–40 секунд; при высокой
            нагрузке — дольше. Не закрывай эту страницу.
          </p>
          <div className="grid max-w-2xl grid-cols-2 gap-4">
            <div className="skeleton aspect-[3/4] rounded-2xl" />
            <div className="skeleton aspect-[3/4] rounded-2xl" />
          </div>
        </section>
      )}

      {result && status === "idle" && (
        <section className="flex animate-fade-in-up flex-col gap-5">
          <BlockTitle>Результат</BlockTitle>
          <div className="grid max-w-3xl grid-cols-2 gap-4">
            <figure>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-media">
                <ResultImage src={profile.photoPath ?? ""} alt="До примерки" />
                <span className="absolute left-3 top-3 rounded-full bg-espresso/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-canvas backdrop-blur-sm">
                  До
                </span>
              </div>
            </figure>
            <figure>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-media shadow-lift ring-2 ring-clay">
                <ResultImage
                  src={result.resultImagePath}
                  alt="После примерки"
                />
                <span className="absolute left-3 top-3 rounded-full bg-clay px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-canvas">
                  После
                </span>
              </div>
            </figure>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                downloadImage(result.resultImagePath, "smart-fashion-tryon.jpg")
              }
              className="button-dark"
            >
              <Download className="size-4" />
              Скачать
            </button>
          </div>
        </section>
      )}

      <section className="pt-4">
        {history === null ? (
          <>
            <BlockTitle>История примерок</BlockTitle>
            <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="skeleton aspect-[3/4] w-28 shrink-0 rounded-xl sm:w-32"
                />
              ))}
            </div>
          </>
        ) : history.length === 0 ? (
          <>
            <BlockTitle>История примерок</BlockTitle>
            <p className="mt-4 text-[15px] text-ink-soft">
              Пусто — заверши первую примерку, и она появится здесь.
            </p>
          </>
        ) : (
          <Carousel title="История примерок" count={history.length}>
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  downloadImage(
                    entry.resultImagePath,
                    "smart-fashion-tryon.jpg",
                  )
                }
                className="group w-28 shrink-0 text-left sm:w-32"
                title="Скачать"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-media ring-1 ring-hair-ink transition-shadow group-hover:ring-clay">
                  <ResultImage
                    src={entry.resultImagePath}
                    alt={`Примерка от ${formatDate(entry.createdAt)}`}
                  />
                  <span className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-surface/90 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Download className="size-3.5" />
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-ink-soft">
                  {formatDate(entry.createdAt)}
                </p>
              </button>
            ))}
          </Carousel>
        )}
      </section>
    </div>
  );
}
