"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  Clock3Icon,
  MapPinIcon,
  SparklesIcon,
  StarIcon,
  TimerIcon,
  UsersIcon,
} from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

import type { CoursePlace } from "@/features/courses/course-edit-model";

type CoursePlaceDetailModalProps = {
  place: CoursePlace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (place: CoursePlace) => void;
};

const highlightIcons = [TimerIcon, UsersIcon, SparklesIcon] as const;
const reviewCountFormatter = new Intl.NumberFormat("ko-KR");

function CoursePlaceDetailModal({
  place,
  open,
  onOpenChange,
  onApply,
}: CoursePlaceDetailModalProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  if (!place) return null;

  const { detail } = place;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-180 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Popup
            ref={popupRef}
            initialFocus={popupRef}
            className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-[28rem] overflow-y-auto rounded-[1.75rem] border border-white/70 bg-card p-4 text-foreground shadow-floating outline-none transition-[transform,opacity] duration-180 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0"
          >
            <Dialog.Title className="type-title-md text-center">
              장소 상세 정보
            </Dialog.Title>

            <div className="relative mt-4 aspect-[16/7] overflow-hidden rounded-2xl bg-muted">
              <Image
                src={place.image.src}
                alt={place.image.alt}
                fill
                loading="eager"
                sizes="(max-width: 480px) calc(100vw - 64px), 416px"
                className="object-cover"
              />
            </div>

            <section className="pt-4" aria-labelledby={`place-modal-${place.id}`}>
              <h3 id={`place-modal-${place.id}`} className="type-title-lg">
                {place.title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="type-caption rounded-full bg-primary-subtle px-3 py-1.5 font-semibold text-primary">
                  {place.category}
                </span>
                <span className="type-label inline-flex items-center gap-1">
                  <StarIcon
                    aria-hidden="true"
                    className="size-4 fill-rating text-rating"
                  />
                  {detail.rating.toFixed(1)}
                </span>
                <span className="type-caption text-muted-foreground">
                  ({reviewCountFormatter.format(detail.reviewCount)})
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-muted-foreground">
                <div className="type-body-md flex items-start gap-2">
                  <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <dt className="sr-only">주소</dt>
                  <dd>{detail.addressLabel}</dd>
                </div>
                <div className="type-body-md flex items-start gap-2">
                  <Clock3Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <dt className="sr-only">운영시간</dt>
                  <dd>{detail.hoursLabel}</dd>
                </div>
              </dl>

              <Dialog.Description className="type-body-md mt-4 text-muted-foreground">
                {detail.description}
              </Dialog.Description>

              <ul aria-label="장소 특징" className="mt-4 flex flex-wrap gap-2">
                {detail.highlights.map((highlight, index) => {
                  const Icon = highlightIcons[index] ?? SparklesIcon;
                  return (
                    <li
                      key={highlight}
                      className="type-caption inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/15 bg-primary-subtle/60 px-3 font-semibold text-primary"
                    >
                      <Icon aria-hidden="true" className="size-3.5" />
                      {highlight}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="mt-5" aria-labelledby={`place-reasons-${place.id}`}>
              <h4 id={`place-reasons-${place.id}`} className="type-label">
                추천 이유
              </h4>
              <ul className="type-body-md mt-2 space-y-1.5 text-muted-foreground">
                {detail.recommendationReasons.map((reason) => (
                  <li key={reason} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-1.5">
                    <span aria-hidden="true" className="text-primary">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-5" aria-labelledby={`place-reviews-${place.id}`}>
              <h4 id={`place-reviews-${place.id}`} className="type-label">
                방문자 한줄 후기
              </h4>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {detail.reviews.map((review) => (
                  <li
                    key={review.id}
                    className="rounded-xl border border-border bg-secondary/45 p-3"
                  >
                    <p className="type-caption text-foreground">{review.content}</p>
                    <p className="type-caption mt-2 inline-flex items-center gap-1 font-semibold">
                      <StarIcon
                        aria-hidden="true"
                        className="size-3.5 fill-rating text-rating"
                      />
                      {review.rating.toFixed(1)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <div className="mt-5 grid grid-cols-[0.8fr_1.2fr] gap-3">
              <Dialog.Close className="type-label min-h-12 rounded-xl border border-border bg-card px-4 text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25">
                닫기
              </Dialog.Close>
              <Dialog.Close
                className="type-label min-h-12 rounded-xl bg-primary px-4 text-primary-foreground outline-none transition-[background-color,transform] hover:bg-primary-pressed active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/25"
                onClick={() => onApply(place)}
              >
                일정에 반영하기
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { CoursePlaceDetailModal, type CoursePlaceDetailModalProps };
