"use client";

import { useState, type UIEvent } from "react";
import Image from "next/image";

import type { DiscoveryImage } from "@/features/discovery/discovery-model";

type FestivalGalleryProps = {
  gallery: readonly DiscoveryImage[];
};

function FestivalGallery({ gallery }: FestivalGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleScroll(event: UIEvent<HTMLUListElement>) {
    const { clientWidth, scrollLeft } = event.currentTarget;
    if (clientWidth === 0) return;
    setCurrentIndex(
      Math.min(
        gallery.length - 1,
        Math.max(0, Math.round(scrollLeft / clientWidth)),
      ),
    );
  }

  if (gallery.length === 0) return null;

  return (
    <section className="relative">
      <ul
        aria-label="축제 이미지"
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto"
        onScroll={handleScroll}
      >
        {gallery.map((image) => (
          <li key={image.src} className="w-full shrink-0 snap-center">
            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 480px) 100vw, 480px"
                className="object-cover"
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="type-caption absolute right-3 bottom-3 rounded-full bg-image-scrim px-2.5 py-1 text-image-foreground">
        {currentIndex + 1}/{gallery.length}
      </p>
    </section>
  );
}

export { FestivalGallery, type FestivalGalleryProps };
