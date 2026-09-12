"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { PlaceListItem } from "@haetteum/contracts";
import { resolvePlacePhotoSource } from "@/lib/official-image";

export function SearchPlaceResult({ place }: { place: PlaceListItem }) {
  const source = resolvePlacePhotoSource(place.primaryImageUrl);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showPhoto = source !== null && source !== failedSource;
  return (
    <li className="min-w-0">
      <article aria-label={place.title}>
        <Link
          href={`/places/${place.id}?tab=introduction`}
          prefetch={false}
          className={`grid min-h-11 gap-2 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/25 ${showPhoto ? "" : "border border-border p-3"}`}
        >
          {showPhoto && (
            <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
              <Image
                src={source}
                alt={`${place.title} 대표 이미지`}
                fill
                sizes="(max-width: 480px) 50vw, 224px"
                className="object-cover"
                onError={() => setFailedSource(source)}
              />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="type-label break-words text-foreground">
              {place.title}
            </h3>
            {(place.address ?? place.district) && (
              <p className="type-caption mt-0.5 break-words text-muted-foreground">
                {place.address ?? place.district}
              </p>
            )}
          </div>
        </Link>
      </article>
    </li>
  );
}
