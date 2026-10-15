"use client";
import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkeletonImageProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  placeholderClassName?: string;
  fallbackSrc?: string;
}
export function SkeletonImage(props: SkeletonImageProps) {
  return <ImageWithState key={props.src} {...props} />;
}
function ImageWithState({
  src,
  alt,
  sizes,
  className,
  priority,
  placeholderClassName,
  fallbackSrc,
}: SkeletonImageProps) {
  const [source, setSource] = useState(src);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (failed)
    return (
      <div
        role="img"
        aria-label={alt}
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas-2 p-4 text-center text-xs text-ink-soft"
      >
        <ImageOff className="size-6" strokeWidth={1.3} />
        <span>Фото пока недоступно</span>
      </div>
    );
  return (
    <>
      {!loaded && (
        <div
          aria-hidden
          className={cn("absolute inset-0 bg-canvas-2", placeholderClassName)}
        />
      )}
      <Image
        src={source}
        alt={alt}
        fill
        unoptimized={!source.startsWith("/")}
        preload={priority}
        sizes={sizes ?? "(max-width:640px) 50vw, 25vw"}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (fallbackSrc && source !== fallbackSrc) setSource(fallbackSrc);
          else setFailed(true);
        }}
        className={cn("object-cover", className)}
      />
    </>
  );
}
