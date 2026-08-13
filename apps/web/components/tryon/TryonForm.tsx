"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { useStoredProfile, type StoredProfile } from "@/lib/profileStorage";
import { Carousel } from "@/components/tryon/Carousel";

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
      aria-pressed={selected}
      className="group w-24 shrink-0 text-left sm:w-28"
    >
      <div
        className={
          "relative aspect-[3/4] overflow-hidden bg-canvas-2 transition-all duration-300 " +
          (selected ? "ring-2 ring-clay ring-offset-2 ring-offset-canvas" : "ring-1 ring-hair-ink")
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={catalogImageUrl(item.imagePath)}
          alt={item.description ?? item.category}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {selected && (
          <span className="absolute bottom-0 left-0 right-0 bg-clay py-1 text-center font-grotesk text-[9px] uppercase tracking-[0.2em] text-canvas">
            выбрано
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 font-grotesk text-[10px] leading-tight text-ink-soft">
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

  // photoPath заполняется и загруженным фото, и сгенерированной моделью
  // (см. app/api/profile) — здесь показываем, на чём именно будет примерка,
  // чтобы это не было чёрным ящиком.
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-hair-ink py-4">
      <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-canvas-2 ring-1 ring-hair-ink">
        {profile.photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoPath} alt="Модель для примерки" className="h-full w-full object-cover" />
        ) : null}
      </span>
      {badges.map((badge) => (
        <span
          key={badge}
          className="border border-hair-ink px-2.5 py-1 font-grotesk text-[10px] uppercase tracking-[0.14em] text-ink-soft"
        >
          {badge}
        </span>
      ))}
      <Link
        href="/profile"
        className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-clay transition-colors hover:text-ink"
      >
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
  const [shoesId, setShoesId] = useState<string | null>(() => searchParams.get("shoes"));
  const [bagId, setBagId] = useState<string | null>(() => searchParams.get("bag"));
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

  // Без анкеты примерять не на что. Раньше здесь был один абзац, из которого
  // невозможно было понять, что фото вообще необязательно — генерация модели
  // была спрятана тумблером в самом низу анкеты. Теперь это явная развилка
  // из двух равноправных путей.
  if (!profile) {
    return (
      <div className="mt-10 animate-fade-in-up">
        <p className="max-w-lg font-grotesk text-sm leading-relaxed text-ink-soft">
          Для примерки нужна модель — фигура, на которую нейросеть положит вещь.
          Выбери, откуда её взять:
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/profile"
            className="group relative border border-hair-ink bg-canvas-2 p-6 transition-colors hover:border-ink"
          >
            <span className="font-display text-3xl text-clay">01</span>
            <h3 className="mt-3 font-display text-xl uppercase tracking-tight text-ink">
              Своё фото
            </h3>
            <p className="mt-2 font-grotesk text-[13px] leading-relaxed text-ink-soft">
              Снимок в полный рост — результат будет максимально похож на тебя.
            </p>
            <span className="mt-5 block h-px w-full bg-hair-ink">
              <span className="block h-px w-0 bg-clay transition-all duration-500 group-hover:w-full" />
            </span>
          </Link>

          <Link
            href="/profile?model=generated"
            className="group relative border border-clay bg-clay/5 p-6 transition-colors hover:bg-clay/10"
          >
            <span className="font-display text-3xl text-clay">02</span>
            <h3 className="mt-3 font-display text-xl uppercase tracking-tight text-ink">
              Модель по анкете
            </h3>
            <p className="mt-2 font-grotesk text-[13px] leading-relaxed text-ink-soft">
              Фото не нужно. Соберём женскую или мужскую модель по росту, весу,
              телосложению, тону кожи и позе.
            </p>
            <span className="mt-5 block h-px w-full bg-hair-ink">
              <span className="block h-px w-0 bg-clay transition-all duration-500 group-hover:w-full" />
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      <ProfileSummary profile={profile} />

      {looks.length > 0 && (
        <Carousel title="Готовые образы" count={looks.length}>
          {looks.map((look) => (
            <ItemThumb
              key={look.lookId}
              item={look.topItem}
              selected={topId === look.topItem.id && bottomId === look.bottomItem.id}
              onClick={() => pickLook(look)}
            />
          ))}
        </Carousel>
      )}

      <Carousel title="Верх" count={tops.length}>
        {tops.map((item) => (
          <ItemThumb key={item.id} item={item} selected={topId === item.id} onClick={() => toggleTop(item.id)} />
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
            <ItemThumb key={item.id} item={item} selected={bagId === item.id} onClick={() => toggleBag(item.id)} />
          ))}
        </Carousel>
      )}

      {!anchorId || visibleMatches.length === 0 ? (
        <section>
          <p className="border-b border-hair-ink pb-2.5 font-grotesk text-[10px] uppercase tracking-[0.3em] text-ink-soft">
            Дополните образ
          </p>
          <p className="mt-4 font-grotesk text-sm text-ink-soft">
            {!anchorId
              ? "Выбери вещь выше, чтобы увидеть, что к ней подходит."
              : "Пока нечего предложить к этому выбору."}
          </p>
        </section>
      ) : (
        <Carousel title="Дополните образ" count={visibleMatches.length}>
          {visibleMatches.map((item) => (
            <Link key={item.id} href={`/catalog/${item.id}`} className="group w-24 shrink-0 sm:w-28">
              <div className="relative aspect-[3/4] overflow-hidden bg-canvas-2 ring-1 ring-hair-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={catalogImageUrl(item.imagePath)}
                  alt={item.description ?? item.category}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 font-grotesk text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                {CATEGORY_LABELS[item.category as CatalogCategory] ?? item.category}
              </p>
            </Link>
          ))}
        </Carousel>
      )}

      {error && (
        <p className="border-l-2 border-clay bg-clay/5 px-4 py-3 font-grotesk text-sm text-ink">{error}</p>
      )}

      <button
        type="button"
        onClick={handleTryOn}
        disabled={selectedCount === 0 || status === "loading"}
        className="group relative w-full self-start bg-clay px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] text-canvas transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        <span className="pointer-events-none absolute inset-0 translate-x-1.5 translate-y-1.5 border border-clay transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-disabled:translate-x-1.5 group-disabled:translate-y-1.5" />
        {status === "loading"
          ? selectedCount > 1
            ? "Примеряем… до пары минут"
            : "Примеряем… 5–20 секунд"
          : `Примерить${selectedCount > 0 ? ` · ${selectedCount}` : ""}`}
      </button>

      {status === "loading" && (
        <section className="border-t border-hair-ink pt-8">
          <p className="font-grotesk text-[10px] uppercase tracking-[0.3em] text-ink-soft">Результат</p>
          <div className="mt-4 grid max-w-2xl grid-cols-2 gap-4">
            <div className="aspect-[3/4] animate-pulse bg-canvas-2 ring-1 ring-hair-ink" />
            <div className="aspect-[3/4] animate-pulse bg-canvas-2 ring-1 ring-hair-ink" />
          </div>
        </section>
      )}

      {result && status === "idle" && (
        <section className="animate-fade-in-up border-t border-hair-ink pt-8">
          <p className="font-grotesk text-[10px] uppercase tracking-[0.3em] text-ink-soft">Результат</p>
          <div className="mt-4 grid max-w-2xl grid-cols-2 gap-4">
            <div>
              <div className="relative aspect-[3/4] overflow-hidden bg-canvas-2 ring-1 ring-hair-ink">
                <ResultImage src={profile.photoPath ?? ""} alt="До примерки" />
              </div>
              <p className="mt-2 text-center font-grotesk text-[10px] uppercase tracking-[0.24em] text-ink-soft">
                До
              </p>
            </div>
            <div>
              <div className="relative aspect-[3/4] overflow-hidden bg-canvas-2 ring-1 ring-clay">
                <ResultImage src={result.resultImagePath} alt="После примерки" />
              </div>
              <p className="mt-2 text-center font-grotesk text-[10px] uppercase tracking-[0.24em] text-clay">
                После
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => downloadImage(result.resultImagePath, "zhibek-tryon.jpg")}
            className="mt-6 border border-hair-ink px-8 py-3.5 font-grotesk text-[12px] uppercase tracking-[0.16em] text-ink transition-colors hover:border-ink"
          >
            Скачать
          </button>
        </section>
      )}

      <section className="border-t border-hair-ink pt-8">
        {history === null ? (
          <>
            <p className="font-grotesk text-[10px] uppercase tracking-[0.3em] text-ink-soft">
              История примерок
            </p>
            <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-[3/4] w-24 shrink-0 animate-pulse bg-canvas-2 sm:w-28" />
              ))}
            </div>
          </>
        ) : history.length === 0 ? (
          <>
            <p className="font-grotesk text-[10px] uppercase tracking-[0.3em] text-ink-soft">
              История примерок
            </p>
            <p className="mt-4 font-grotesk text-sm text-ink-soft">
              Пусто — заверши первую примерку, и она появится здесь.
            </p>
          </>
        ) : (
          <Carousel title="История примерок" count={history.length}>
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => downloadImage(entry.resultImagePath, "zhibek-tryon.jpg")}
                className="group w-24 shrink-0 text-left sm:w-28"
                title="Скачать"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-canvas-2 ring-1 ring-hair-ink transition-all group-hover:ring-clay">
                  <ResultImage src={entry.resultImagePath} alt={`Примерка от ${formatDate(entry.createdAt)}`} />
                </div>
                <p className="mt-2 font-grotesk text-[10px] text-ink-soft">{formatDate(entry.createdAt)}</p>
              </button>
            ))}
          </Carousel>
        )}
      </section>
    </div>
  );
}
