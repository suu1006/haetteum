"use client";

import Image from "next/image";
import { useState, type UIEvent } from "react";

import type { DiscoveryImage } from "@/features/discovery/discovery-model";

type PlaceImageGalleryProps = {
  title: string;
  images: readonly DiscoveryImage[];
};

function PlaceImageGallery({ title, images }: PlaceImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleScroll(event: UIEvent<HTMLUListElement>) {
    const { clientWidth, scrollLeft } = event.currentTarget;
    if (clientWidth === 0) return;
    setCurrentIndex(
      Math.min(
        images.length - 1,
        Math.max(0, Math.round(scrollLeft / clientWidth)),
      ),
    );
  }

  if (images.length === 0) return null;

  return (
    <section aria-label={`${title} 이미지 갤러리`} className="relative">
      <ul
        aria-label={`${title} 사진`}
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto"
        onScroll={handleScroll}
      >
        {images.map((image, index) => (
          <li key={image.src} className="w-full shrink-0 snap-center">
            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 480px) 100vw, 480px"
                className="object-cover"
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="type-caption absolute right-3 bottom-3 rounded-full bg-image-scrim px-2.5 py-1 text-image-foreground">
        {currentIndex + 1}/{images.length}
      </p>
    </section>
  );
}

export { PlaceImageGallery, type PlaceImageGalleryProps };
