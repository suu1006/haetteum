"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ExternalLinkIcon, MapPinIcon, XIcon } from "lucide-react";
import type { ExternalPlaceSearchItem } from "@haetteum/contracts";
import { Modal } from "@/components/ui/modal/modal";

const cardClassName =
  "grid min-h-11 w-full gap-2 rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/25";

export function ExternalPlaceResult({
  place,
}: {
  place: ExternalPlaceSearchItem;
}) {
  const address = place.roadAddress ?? place.address;
  const [imageFailed, setImageFailed] = useState(false);
  const card = (
    <>
      <span className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
        {place.imageUrl && !imageFailed ? (
          <Image
            src={place.imageUrl}
            alt={`${place.title} 이미지`}
            fill
            sizes="(max-width: 480px) 50vw, 224px"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <MapPinIcon className="size-8" aria-hidden="true" />
        )}
      </span>
      <span className="type-label break-words text-foreground">
        {place.title}
      </span>
      {address && (
        <span className="type-caption break-words text-muted-foreground">
          {address}
        </span>
      )}
      <span className="type-caption text-muted-foreground">
        {place.categoryLabel}
      </span>
    </>
  );

  if (place.matchedPlaceId) {
    return (
      <li className="min-w-0">
        <Link
          href={`/places/${place.matchedPlaceId}?tab=introduction`}
          prefetch={false}
          className={cardClassName}
        >
          {card}
        </Link>
      </li>
    );
  }

  return (
    <li className="min-w-0">
      <Modal.Root>
        <Modal.Trigger className={cardClassName}>{card}</Modal.Trigger>
        <Modal.Portal>
          <Modal.Backdrop />
          <Modal.Viewport className="items-end overflow-y-auto sm:items-center sm:p-4">
            <Modal.Popup className="max-h-[90dvh] max-w-[30rem] overflow-y-auto rounded-t-3xl px-5 pt-5 pb-[calc(1.5rem+var(--safe-area-bottom))] sm:rounded-3xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="type-caption text-muted-foreground">
                    장소 안내
                  </span>
                  <Modal.Title className="type-title-md mt-1 break-words">
                    {place.title}
                  </Modal.Title>
                </div>
                <Modal.Close
                  aria-label="닫기"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                >
                  <XIcon className="size-5" aria-hidden="true" />
                </Modal.Close>
              </div>
              <Modal.Description className="type-caption mt-2 text-muted-foreground">
                카카오맵에서 제공하는 장소 정보예요.
              </Modal.Description>
              <div className="mt-5 flex items-center gap-2 text-primary">
                <MapPinIcon className="size-5 shrink-0" aria-hidden="true" />
                <span className="type-label">{place.categoryLabel}</span>
              </div>
              <dl className="type-body-md mt-5 space-y-4">
                <div>
                  <dt className="type-caption text-muted-foreground">주소</dt>
                  <dd className="mt-1 break-words">
                    {address ?? "등록된 주소가 없어요."}
                  </dd>
                </div>
              </dl>
              <p className="type-caption mt-6 rounded-xl bg-muted p-4 text-muted-foreground">
                상세 설명과 사진은 아직 준비되지 않았어요. 더 자세한 정보는
                카카오맵에서 확인해 주세요.
              </p>
              <a
                href={place.placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="type-label mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                카카오맵에서 자세히 보기{" "}
                <ExternalLinkIcon className="size-4" aria-hidden="true" />
              </a>
            </Modal.Popup>
          </Modal.Viewport>
        </Modal.Portal>
      </Modal.Root>
    </li>
  );
}
