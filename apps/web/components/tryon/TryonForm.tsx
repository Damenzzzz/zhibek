"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { useStoredProfile, type StoredProfile } from "@/lib/profileStorage";

// Клиентский предохранитель поверх серверного poll-таймаута FASHN (3 минуты,
// см. lib/fashn.ts) — если сервер вообще не ответит, не виснем бесконечно.
// Обувь/сумка добавляют ещё до 2 доп. последовательных вызовов FASHN
// (tryon-max, см. lib/fashn.ts tryOnAccessory) поверх примерки одежды,
// поэтому таймаут поднят с прежних 4 минут.
const CLIENT_TIMEOUT_MS = 6 * 60 * 1000;

interface Item {
  id: string;
  category: string;
  color: string | null;
  description: string | null;
  imagePath: string;
  lookId: string;
}

interface Look {
  lookId: string;
  topItem: Item;
  bottomItem: Item;
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
      className={
        "w-24 shrink-0 rounded-2xl border-2 p-1 text-left transition-colors sm:w-28 " +
        (selected ? "border-accent" : "border-transparent hover:border-line")
      }
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-paper-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={catalogImageUrl(item.imagePath)}
          alt={item.description ?? item.category}
          className="h-full w-full object-cover"
        />
      </div>
      <p className="mt-1.5 line-clamp-2 px-1 pb-1 text-[10px] leading-tight text-ink-soft">
        {item.description ?? CATEGORY_LABELS[item.category as CatalogCategory]}
      </p>
    </button>
  );
}

const AGE_RANGE_LABELS: Record<string, string> = {
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

function ProfileSummary({ profile }: { profile: StoredProfile }) {
  const badges = [
    `${profile.heightCm} см`,
    `${profile.weightKg} кг`,
    profile.ageRange ? AGE_RANGE_LABELS[profile.ageRange] ?? profile.ageRange : null,
    profile.skinTone ? SKIN_TONE_LABELS[profile.skinTone] ?? profile.skinTone : null,
    profile.clothingSize ? `Размер ${profile.clothingSize}` : null,
    profile.pose ? POSE_LABELS[profile.pose] ?? profile.pose : null,
  ].filter((b): b is string => Boolean(b));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((badge) => (
        <span key={badge} className="rounded-full border border-line bg-paper-soft px-3 py-1 text-xs text-ink-soft">
          {badge}
        </span>
      ))}
      <Link href="/profile" className="text-xs font-medium text-accent transition-colors hover:text-ink">
        Изменить анкету
      </Link>
    </div>
  );
}

function ResultImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bone-soft px-2 text-center text-[11px] text-ink-soft">
        Не удалось загрузить изображение
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setFailed(true)} className="h-full w-full object-cover" />
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
  // Примерочная (см. app/fitting-room) может передать сюда предвыбор через
  // ?top=/?bottom= — читаем один раз при монтировании.
  const [topId, setTopId] = useState<string | null>(() => searchParams.get("top"));
  const [bottomId, setBottomId] = useState<string | null>(() => searchParams.get("bottom"));
  const [shoesId, setShoesId] = useState<string | null>(null);
  const [bagId, setBagId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TryonResult | null>(null);
  const [matches, setMatches] = useState<Item[]>([]);
  const [history, setHistory] = useState<TryonResult[] | null>(null);

  // Якорь для рекомендаций "Дополните образ" — первая выбранная вещь любой
  // категории. Пока ничего не выбрано (свежий заход без предвыбора), anchor
  // остаётся null — и блок ниже явно показывает подсказку вместо того, чтобы
  // тихо пропасть (это и была причина жалобы "не работает" — см. план).
  const anchorId = topId ?? bottomId ?? shoesId ?? bagId;

  useEffect(() => {
    let cancelled = false;
    const request = anchorId
      ? fetch(`/api/catalog/${anchorId}/matches`).then((res) => res.json()).then((data) => data.items ?? [])
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
      ? fetch(`/api/tryon/history?userId=${profile.id}`).then((res) => res.json()).then((data) => data.items ?? [])
      : Promise.resolve(null);

    request
      .then((items) => {
        if (!cancelled) setHistory(items);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, [profile]);

  const selectedIds = new Set([topId, bottomId, shoesId, bagId].filter(Boolean));
  const visibleMatches = matches.filter((item) => !selectedIds.has(item.id));
  const selectedCount = selectedIds.size;

  function pickLook(look: Look) {
    setTopId(look.topItem.id);
    setBottomId(look.bottomItem.id);
    setResult(null);
  }

  function toggleTop(id: string) {
    setTopId((current) => (current === id ? null : id));
    setResult(null);
  }

  function toggleBottom(id: string) {
    setBottomId((current) => (current === id ? null : id));
    setResult(null);
  }

  function toggleShoes(id: string) {
    setShoesId((current) => (current === id ? null : id));
    setResult(null);
  }

  function toggleBag(id: string) {
    setBagId((current) => (current === id ? null : id));
    setResult(null);
  }

  async function handleTryOn() {
    if (!profile || (!topId && !bottomId && !shoesId && !bagId)) return;
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
          topItemId: topId,
          bottomItemId: bottomId,
          shoesItemId: shoesId,
          bagItemId: bagId,
        }),
        signal: controller.signal,
      });
      const data = await response.json();
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
          ? "Не дождались ответа от FASHN — попробуй ещё раз"
          : "Не удалось связаться с сервером"
      );
      setStatus("idle");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (!profile) {
    return (
      <div className="mt-10 rounded-2xl border border-line bg-paper-soft px-5 py-8 text-center">
        <p className="text-sm text-ink-soft">Сначала заполни анкету — нужно фото для примерки.</p>
        <Link
          href="/profile"
          className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Заполнить анкету
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      <ProfileSummary profile={profile} />

      {looks.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Готовые образы</p>
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {looks.map((look) => (
              <ItemThumb
                key={look.lookId}
                item={look.topItem}
                selected={topId === look.topItem.id && bottomId === look.bottomItem.id}
                onClick={() => pickLook(look)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Верх</p>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {tops.map((item) => (
            <ItemThumb key={item.id} item={item} selected={topId === item.id} onClick={() => toggleTop(item.id)} />
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Низ</p>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {bottoms.map((item) => (
            <ItemThumb
              key={item.id}
              item={item}
              selected={bottomId === item.id}
              onClick={() => toggleBottom(item.id)}
            />
          ))}
        </div>
      </section>

      {shoes.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Обувь</p>
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {shoes.map((item) => (
              <ItemThumb
                key={item.id}
                item={item}
                selected={shoesId === item.id}
                onClick={() => toggleShoes(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {bags.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Сумки</p>
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {bags.map((item) => (
              <ItemThumb key={item.id} item={item} selected={bagId === item.id} onClick={() => toggleBag(item.id)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Дополните образ</p>
        {!anchorId ? (
          <p className="mt-3 text-sm text-ink-soft">Выбери вещь выше, чтобы увидеть, что к ней подходит.</p>
        ) : visibleMatches.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Пока нечего предложить к этому выбору.</p>
        ) : (
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {visibleMatches.map((item) => (
              <Link key={item.id} href={`/catalog/${item.id}`} className="group w-24 shrink-0 sm:w-28">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-paper-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={catalogImageUrl(item.imagePath)}
                    alt={item.description ?? item.category}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  {CATEGORY_LABELS[item.category as CatalogCategory] ?? item.category}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {error && <p className="rounded-xl border border-accent/40 bg-accent-soft px-3.5 py-2.5 text-sm text-ink">{error}</p>}

      <button
        type="button"
        onClick={handleTryOn}
        disabled={selectedCount === 0 || status === "loading"}
        className="w-full rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === "loading"
          ? selectedCount > 1
            ? "Примеряем… может занять до пары минут"
            : "Примеряем… обычно 5–20 секунд"
          : "Примерить"}
      </button>

      {status === "loading" && (
        <section className="border-t border-line pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Результат</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="aspect-[3/4] animate-pulse rounded-2xl border border-line bg-paper-soft" />
            <div className="aspect-[3/4] animate-pulse rounded-2xl border border-line bg-paper-soft" />
          </div>
        </section>
      )}

      {result && status === "idle" && (
        <section className="border-t border-line pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">Результат</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-paper-soft">
                <ResultImage src={profile.photoPath ?? ""} alt="До примерки" />
              </div>
              <p className="mt-1.5 text-center text-[10px] uppercase tracking-[0.12em] text-ink-soft">До</p>
            </div>
            <div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-paper-soft">
                <ResultImage src={result.resultImagePath} alt="После примерки" />
              </div>
              <p className="mt-1.5 text-center text-[10px] uppercase tracking-[0.12em] text-ink-soft">После</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => downloadImage(result.resultImagePath, "zhibek-tryon.jpg")}
            className="mt-4 w-full rounded-full border border-ink/20 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink/40 sm:w-auto"
          >
            Скачать
          </button>
        </section>
      )}

      <section className="border-t border-line pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">История примерок</p>

        {history === null ? (
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[3/4] w-24 shrink-0 animate-pulse rounded-2xl border border-line bg-paper-soft sm:w-28" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            История примерок пуста — заверши первую примерку, и она появится здесь.
          </p>
        ) : (
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => downloadImage(entry.resultImagePath, "zhibek-tryon.jpg")}
                className="w-24 shrink-0 rounded-2xl border border-line text-left transition-colors hover:border-ink/30 sm:w-28"
                title="Скачать"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl bg-paper-soft">
                  <ResultImage src={entry.resultImagePath} alt={`Примерка от ${formatDate(entry.createdAt)}`} />
                </div>
                <p className="mt-1.5 px-1 pb-1 text-[10px] text-ink-soft">{formatDate(entry.createdAt)}</p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
