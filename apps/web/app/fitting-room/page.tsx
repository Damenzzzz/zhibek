"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bookmark, X } from "lucide-react";
import { PageHeading } from "@/components/PageHeading";
import { SkeletonImage } from "@/components/SkeletonImage";
import { useSavedItems } from "@/lib/useSavedItems";
import { removeFittingRoomItem } from "@/lib/fittingRoomStorage";
import { buildTryonHref } from "@/lib/catalogView";
import { catalogImageUrl } from "@/lib/catalogDisplay";

export default function FittingRoomPage() {
  const { ids, items, loading, error, retry, missing } = useSavedItems();
  const router = useRouter();
  return (
    <main className="flex-1">
      <PageHeading
        label="Твоя личная подборка"
        title="Всё, что приглянулось."
        description="Сохраняй вещи, возвращайся к любимым сочетаниям и собирай следующий образ."
      />
      <div className="site-container py-10 sm:py-16">
        {loading ? (
          <div
            aria-label="Загружаем подборку"
            className="grid grid-cols-2 gap-5 md:grid-cols-4"
          >
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] bg-canvas-2" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-hair-ink p-8">
            <p className="text-sm text-ink-soft">{error}</p>
            <button
              type="button"
              className="button-secondary mt-5"
              onClick={retry}
            >
              Повторить загрузку
            </button>
          </div>
        ) : !items.length ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-hair-ink bg-canvas-2/30 px-6 py-16 text-center">
            <Bookmark className="mx-auto size-9 text-clay" strokeWidth={1.2} />
            <h2 className="mt-6 font-display text-3xl">
              Начнём с вдохновения?
            </h2>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-ink-soft">
              {ids.length
                ? "Сохранённые вещи больше недоступны. В коллекции можно найти новые сочетания."
                : "Твоя примерочная пока пуста. Нажимай на закладку у понравившихся вещей — они будут ждать здесь."}
            </p>
            <Link href="/catalog" className="button-primary mt-7">
              Посмотреть коллекцию <ArrowUpRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_300px]">
            <div>
              <p className="mb-6 text-xs tabular-nums text-ink-soft">
                В твоей подборке: {items.length}
              </p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3">
                {items.map((item) => (
                  <article key={item.id} className="relative min-w-0">
                    <Link href={`/catalog/${item.id}`}>
                      <div className="relative aspect-[3/4] bg-white/60">
                        <SkeletonImage
                          src={catalogImageUrl(item.imagePath)}
                          alt={item.description ?? item.category}
                          className="object-contain p-3"
                        />
                      </div>
                      <h2 className="mt-4 line-clamp-2 text-sm first-letter:uppercase">
                        {item.description ?? item.category}
                      </h2>
                    </Link>
                    <p className="mt-2 text-xs text-ink-soft">{item.color}</p>
                    <button
                      type="button"
                      onClick={() => removeFittingRoomItem(item.id)}
                      aria-label={`Убрать из примерочной: ${item.description ?? item.id}`}
                      className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-canvas"
                    >
                      <X className="size-4" />
                    </button>
                  </article>
                ))}
              </div>
              {missing > 0 && (
                <p className="mt-6 text-sm text-ink-soft">
                  Часть сохранённых вещей уже убрали из каталога.
                </p>
              )}
            </div>
            <aside className="rounded-2xl border border-hair-ink bg-canvas-2/30 p-6 lg:sticky lg:top-28">
              <span className="tag text-ink-soft">Следующий шаг</span>
              <h2 className="mt-5 font-display text-2xl">Посмотрим на тебе?</h2>
              <p className="mt-4 text-pretty text-sm leading-relaxed text-ink-soft">
                Перенесём в примерку по одной вещи каждой категории. Там можно
                заменить детали или выбрать другой образ.
              </p>
              <button
                type="button"
                className="button-primary mt-6 w-full"
                onClick={() => router.push(buildTryonHref(items))}
              >
                Примерить подборку <ArrowUpRight className="size-4" />
              </button>
              <Link
                href="/catalog"
                className="mt-5 block text-center text-xs text-ink-soft underline underline-offset-4"
              >
                Продолжить выбирать
              </Link>
              <p className="mt-7 border-t border-hair-ink pt-5 text-xs leading-relaxed text-ink-soft">
                Подборка хранится в этом браузере. Регистрация не нужна.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
