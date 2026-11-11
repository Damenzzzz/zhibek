"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import { SkeletonImage } from "@/components/SkeletonImage";
import { cn } from "@/lib/utils";
export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  return (
    <div className="space-y-4">
      <div className="media-well aspect-[3/4] rounded-3xl">
        <SkeletonImage
          src={images[index]}
          alt={alt}
          className="media-product p-[8%]"
          placeholderClassName="skeleton"
          sizes="(max-width:1024px) 90vw, 45vw"
          priority
        />
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Увеличить фото товара"
              className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-surface/90 shadow-soft backdrop-blur transition-colors hover:bg-surface hover:text-clay"
            >
              <Expand className="size-4" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-espresso/80 backdrop-blur-sm data-[state=open]:animate-fade-in" />
            <Dialog.Content className="fixed inset-3 z-50 flex flex-col rounded-3xl bg-media p-4 shadow-lift data-[state=open]:animate-fade-in sm:inset-8 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <Dialog.Title className="line-clamp-1 font-display text-lg first-letter:uppercase">
                  {alt}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Закрыть фото"
                    className="icon-button bg-surface"
                  >
                    <X className="size-5" />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">
                Фото товара в увеличенном виде.
              </Dialog.Description>
              <div className="relative min-h-0 flex-1">
                <SkeletonImage
                  src={images[index]}
                  alt={alt}
                  className="object-contain mix-blend-multiply"
                  placeholderClassName="bg-media"
                  sizes="90vw"
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        {count > 1 && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <button
              type="button"
              aria-label="Предыдущее фото"
              onClick={() => setIndex((index + count - 1) % count)}
              className="flex size-11 items-center justify-center rounded-full bg-surface/90 shadow-soft backdrop-blur transition-colors hover:bg-surface"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="rounded-full bg-surface/90 px-3.5 py-2 text-[13px] tabular-nums shadow-soft backdrop-blur">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              aria-label="Следующее фото"
              onClick={() => setIndex((index + 1) % count)}
              className="flex size-11 items-center justify-center rounded-full bg-surface/90 shadow-soft backdrop-blur transition-colors hover:bg-surface"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}
      </div>
      {count > 1 && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {images.map((src, i) => (
            <button
              type="button"
              key={src}
              onClick={() => setIndex(i)}
              aria-label={`Фото ${i + 1}`}
              aria-pressed={i === index}
              className={cn(
                "relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-xl bg-media transition-shadow",
                i === index
                  ? "ring-2 ring-clay ring-offset-2 ring-offset-canvas"
                  : "ring-1 ring-inset ring-hair-ink hover:ring-ink/40",
              )}
            >
              <SkeletonImage
                src={src}
                alt=""
                className="media-product p-1.5"
                placeholderClassName="bg-media"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
      <p className="text-[13px] text-ink-soft">
        Нажми на значок увеличения, чтобы рассмотреть детали.
      </p>
    </div>
  );
}
