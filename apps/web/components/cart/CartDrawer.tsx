"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, ShoppingBag, X } from "lucide-react";
import { useSavedItems } from "@/lib/useSavedItems";
import { removeFittingRoomItem } from "@/lib/fittingRoomStorage";
import { buildTryonHref } from "@/lib/catalogView";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { SkeletonImage } from "@/components/SkeletonImage";

export function CartDrawer({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { items, loading, error, retry, missing } = useSavedItems(open);
  const router = useRouter();
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/35" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-canvas shadow-xl">
          <div className="border-b border-hair-ink px-6 py-5">
            <div className="flex items-center justify-between">
              <Dialog.Title className="font-display text-2xl">
                Твоя примерочная
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Закрыть примерочную"
                  className="flex size-11 items-center justify-center rounded-full hover:bg-canvas-2"
                >
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-2 text-xs leading-relaxed text-ink-soft">
              Сохраняй сочетания. Примеряй, когда захочется.
            </Dialog.Description>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div aria-label="Загружаем вещи" className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-canvas-2" />
                ))}
              </div>
            ) : error ? (
              <div role="alert">
                <p className="text-sm text-ink-soft">{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="button-secondary mt-4"
                >
                  Повторить
                </button>
              </div>
            ) : !items.length ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <ShoppingBag className="size-9 text-clay" strokeWidth={1.2} />
                <h2 className="mt-5 font-display text-2xl">
                  Место для твоих находок
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Сохраняй понравившиеся вещи значком закладки в каталоге.
                </p>
                <Dialog.Close asChild>
                  <Link href="/catalog" className="button-primary mt-6">
                    Открыть коллекцию <ArrowUpRight className="size-4" />
                  </Link>
                </Dialog.Close>
              </div>
            ) : (
              <ul className="space-y-5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex gap-4 border-b border-hair-ink pb-5"
                  >
                    <Dialog.Close asChild>
                      <Link
                        href={`/catalog/${item.id}`}
                        className="relative aspect-[3/4] w-20 shrink-0 bg-canvas-2"
                      >
                        <SkeletonImage
                          src={catalogImageUrl(item.imagePath)}
                          alt={item.description ?? item.category}
                          sizes="80px"
                          className="object-contain"
                        />
                      </Link>
                    </Dialog.Close>
                    <div className="min-w-0 flex-1 py-2">
                      <p className="line-clamp-2 text-sm first-letter:uppercase">
                        {item.description ?? item.category}
                      </p>
                      <p className="mt-2 text-xs text-ink-soft">{item.color}</p>
                      <button
                        type="button"
                        onClick={() => removeFittingRoomItem(item.id)}
                        className="mt-3 min-h-9 text-xs text-ink-soft underline underline-offset-4"
                      >
                        Убрать из подборки
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {missing > 0 && (
              <p className="mt-4 text-xs text-ink-soft">
                Часть сохранённых вещей больше недоступна в каталоге.
              </p>
            )}
          </div>
          {items.length > 0 && !loading && !error && (
            <div className="space-y-3 border-t border-hair-ink p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                className="button-primary w-full"
                onClick={() => {
                  setOpen(false);
                  router.push(buildTryonHref(items));
                }}
              >
                Перейти к примерке <ArrowUpRight className="size-4" />
              </button>
              <Dialog.Close asChild>
                <Link href="/fitting-room" className="button-secondary w-full">
                  Вся подборка
                </Link>
              </Dialog.Close>
              <p className="text-center text-[11px] text-ink-soft">
                Выберем по одной вещи каждой категории.
              </p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
