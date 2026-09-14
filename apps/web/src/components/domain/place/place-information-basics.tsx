"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";

type PlaceInformationBasicsProps = {
  addressLabel: string;
  contactLabel?: string;
  homepageUrl?: string;
  facilitySummary?: string;
  parkingLabel?: string;
};

function PlaceInformationBasics({
  addressLabel,
  contactLabel,
  homepageUrl,
  facilitySummary,
  parkingLabel,
}: PlaceInformationBasicsProps) {
  const [message, setMessage] = useState("");

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label}를 복사했어요`);
    } catch {
      setMessage(`${label}를 복사하지 못했어요`);
    }
  }

  return (
    <section
      aria-labelledby="place-basic-information-title"
      className="rounded-2xl border border-border bg-card p-4 shadow-card"
    >
      <h2 id="place-basic-information-title" className="type-title-md text-foreground">
        기본 정보
      </h2>
      <dl className="mt-4 space-y-3">
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3">
          <dt className="type-body-md text-muted-foreground">주소</dt>
          <dd className="type-body-md min-w-0 text-foreground">{addressLabel}</dd>
          <dd>
            <button
              type="button"
              aria-label="주소 복사"
              onClick={() => copyValue("주소", addressLabel)}
              className="type-caption flex min-h-9 items-center rounded-full border border-border px-3 font-semibold text-primary outline-none transition-colors hover:bg-primary-subtle focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              복사
            </button>
          </dd>
        </div>

        {contactLabel ? (
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3">
            <dt className="type-body-md text-muted-foreground">연락처</dt>
            <dd className="type-body-md min-w-0 text-foreground">{contactLabel}</dd>
            <dd>
              <button
                type="button"
                aria-label="연락처 복사"
                onClick={() => copyValue("연락처", contactLabel)}
                className="type-caption flex min-h-9 items-center rounded-full border border-border px-3 font-semibold text-primary outline-none transition-colors hover:bg-primary-subtle focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                복사
              </button>
            </dd>
          </div>
        ) : null}

        {homepageUrl ? (
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
            <dt className="type-body-md text-muted-foreground">홈페이지</dt>
            <dd>
              <a
                href={homepageUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="홈페이지 바로가기"
                className="type-body-md inline-flex min-h-9 items-center gap-1.5 rounded-lg font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                바로가기
                <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
              </a>
            </dd>
          </div>
        ) : null}

        {facilitySummary ? (
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
            <dt className="type-body-md text-muted-foreground">대표 시설</dt>
            <dd className="type-body-md text-foreground">{facilitySummary}</dd>
          </div>
        ) : null}

        {parkingLabel ? (
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
            <dt className="type-body-md text-muted-foreground">주차</dt>
            <dd className="type-body-md text-foreground">{parkingLabel}</dd>
          </div>
        ) : null}
      </dl>
      <p
        role="status"
        aria-label="정보 복사 결과"
        aria-live="polite"
        className="sr-only"
      >
        {message}
      </p>
    </section>
  );
}

export { PlaceInformationBasics, type PlaceInformationBasicsProps };
