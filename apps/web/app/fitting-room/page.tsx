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
import { ITEM_FORMS, pluralRu } from "@/lib/utils";

export default function FittingRoomPage() {
  const { ids, items, loading, error, retry, missing } = useSavedItems();
  const router = useRouter();
  return (
    <main className="flex-1">
      <PageHeading
        label="Подборка"
        title={
          <>
            Всё, что <span className="accent-italic">приглянулось.</span>
          </>
        }
        description="Сохраняй вещи, возвращайся к любимым сочетаниям и собирай следующий образ."
      />
      <div className="site-container py-10 sm:py-16">
        {loading ? (
          <div
            aria-label="Загружаем подборку"
            className="grid grid-cols-2 gap-5 md:grid-cols-4"
          >
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="panel p-8">
            <p className="text-[15px] text-ink-soft">{error}</p>
            <button
              type="button"
              className="button-secondary mt-5"
              onClick={retry}
            >
              Повторить загрузку
            </button>
          </div>
        ) : !items.length ? (
          <div className="panel mx-auto max-w-xl px-6 py-16 text-center shadow-soft">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-clay/10">
              <Bookmark className="size-7 text-clay" strokeWidth={1.4} />
            </span>
            <h2 className="mt-7 font-display text-3xl sm:text-4xl">
              Начнём <span className="accent-italic">с вдохновения?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-pretty text-[15px] leading-relaxed text-ink-soft">
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
              <p className="mb-6 text-sm tabular-nums text-ink-soft">
                В твоей подборке:{" "}
                <span className="font-medium text-ink">
                  {pluralRu(items.length, ITEM_FORMS)}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
                {items.map((item) => (
                  <article key={item.id} className="group relative min-w-0">
                    <Link href={`/catalog/${item.id}`}>
                      <div className="media-well aspect-[3/4]">
                        <SkeletonImage
                          src={catalogImageUrl(item.imagePath)}
                          alt={item.description ?? item.category}
                          className="media-product transition-transform duration-500 group-hover:scale-[1.04]"
                          placeholderClassName="skeleton"
                        />
                      </div>
                      <h2 className="mt-4 line-clamp-2 text-[15px] leading-snug transition-colors first-letter:uppercase group-hover:text-clay">
                        {item.description ?? item.category}
                      </h2>
                    </Link>
                    <p className="mt-1.5 text-[13px] text-ink-soft first-letter:uppercase">
                      {item.color}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFittingRoomItem(item.id)}
                      aria-label={`Убрать из примерочной: ${item.description ?? item.id}`}
                      className="absolute right-2.5 top-2.5 flex size-11 items-center justify-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur transition-colors hover:bg-clay hover:text-canvas"
                    >
                      <X className="size-4" />
                    </button>
                  </article>
                ))}
              </div>
              {missing > 0 && (
                <p className="mt-6 text-[15px] text-ink-soft">
                  Часть сохранённых вещей уже убрали из каталога.
                </p>
              )}
            </div>
            <aside className="panel p-6 shadow-soft sm:p-7 lg:sticky lg:top-28">
              <span className="label text-clay">Следующий шаг</span>
              <h2 className="mt-4 font-display text-3xl leading-tight">
                Посмотрим <span className="italic">на тебе?</span>
              </h2>
              <p className="mt-4 text-pretty text-[15px] leading-relaxed text-ink-soft">
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
                className="mt-3 flex min-h-11 items-center justify-center text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
              >
                Продолжить выбирать
              </Link>
              <p className="mt-5 border-t border-hair-ink pt-5 text-[13px] leading-relaxed text-ink-soft">
                Подборка хранится в этом браузере. Регистрация не нужна.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
