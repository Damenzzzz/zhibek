"use client";

import { useState } from "react";
import Image from "next/image";

interface SkeletonImageProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}

// Обёртка над next/image с пульсирующим плейсхолдером на время загрузки —
// используется везде, где показываются фото товаров/примерки, чтобы не было
// пустого места/скачка вёрстки, пока грузится реальная картинка.
export function SkeletonImage({ src, alt, sizes, className, priority }: SkeletonImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <div
        aria-hidden
        className={
          "absolute inset-0 bg-bone-soft transition-opacity duration-500 " +
          (loaded ? "opacity-0" : "animate-pulse opacity-100")
        }
      />
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        priority={priority}
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        className={
          "object-cover transition-all duration-500 " +
          (loaded ? "opacity-100" : "opacity-0") +
          (className ? " " + className : "")
        }
      />
    </>
  );
}
