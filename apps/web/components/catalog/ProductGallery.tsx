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
      <div className="relative aspect-[3/4] bg-white/70">
        <SkeletonImage
          src={images[index]}
          alt={alt}
          className="object-contain p-4"
          sizes="(max-width:1024px) 90vw, 45vw"
          priority
        />
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Увеличить фото товара"
              className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-canvas"
            >
              <Expand className="size-4" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/75" />
            <Dialog.Content className="fixed inset-4 z-50 flex flex-col rounded-xl bg-canvas p-4 sm:inset-8">
              <div className="flex items-center justify-between gap-4">
                <Dialog.Title className="line-clamp-1 text-sm">
                  {alt}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Закрыть фото"
                    className="flex size-11 shrink-0 items-center justify-center"
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
                  className="object-contain"
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
              className="flex size-11 items-center justify-center rounded-full bg-canvas"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="rounded-full bg-canvas px-3 py-2 text-xs tabular-nums">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              aria-label="Следующее фото"
              onClick={() => setIndex((index + 1) % count)}
              className="flex size-11 items-center justify-center rounded-full bg-canvas"
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
                "relative aspect-[3/4] w-20 shrink-0 border bg-white/70",
                i === index ? "border-clay" : "border-hair-ink",
              )}
            >
              <SkeletonImage
                src={src}
                alt=""
                className="object-contain"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-ink-soft">
        Нажми на значок увеличения, чтобы рассмотреть детали.
      </p>
    </div>
  );
}
