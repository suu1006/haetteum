"use client";

import Image from "next/image";
import { Modal } from "@/components/ui/modal/modal";
import type { ReviewImage } from "./review-card";

export function ReviewPhotoGallery({
  author,
  images,
  eagerImages = false,
}: {
  author: string;
  images: readonly ReviewImage[];
  eagerImages?: boolean;
}) {
  if (images.length === 0) return null;

  return (
    <ul
      aria-label={`${author}의 후기 사진`}
      className="scrollbar-none mt-3 flex snap-x gap-2 overflow-x-auto overscroll-x-contain"
    >
      {images.map((image, index) => (
        <li key={`${image.src}-${index}`} className="w-28 shrink-0 snap-start">
          <Modal.Root>
            <Modal.Trigger
              aria-label={`${author}의 후기 사진 ${index + 1} 크게 보기`}
              className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg bg-muted focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Image
                unoptimized
                src={image.src}
                alt={image.alt}
                fill
                sizes="112px"
                loading={eagerImages ? "eager" : "lazy"}
                className="object-cover"
              />
            </Modal.Trigger>
            <Modal.Portal>
              <Modal.Backdrop />
              <Modal.Viewport className="items-center p-4">
                <Modal.Popup className="max-w-4xl overflow-hidden rounded-xl bg-black text-white">
                  <div className="flex items-center justify-between gap-3 p-3">
                    <Modal.Title className="type-body-md">
                      {author}의 후기 사진 {index + 1}/{images.length}
                    </Modal.Title>
                    <Modal.Close
                      aria-label="사진 닫기"
                      className="min-h-11 px-3"
                    >
                      닫기
                    </Modal.Close>
                  </div>
                  <div className="relative h-[min(75dvh,48rem)]">
                    <Image
                      unoptimized
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 896px) 100vw, 896px"
                      className="object-contain"
                    />
                  </div>
                </Modal.Popup>
              </Modal.Viewport>
            </Modal.Portal>
          </Modal.Root>
        </li>
      ))}
    </ul>
  );
}
