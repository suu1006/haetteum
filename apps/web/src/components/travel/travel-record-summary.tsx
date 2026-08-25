import Link from "next/link";
import type { IconType } from "react-icons";
import {
  TbCalendarMonth,
  TbHeart,
  TbMapPin,
  TbMessageDots,
} from "react-icons/tb";

import type { TravelRecordItem } from "@/features/profile/my-page-model";

type TravelRecordSummaryProps = {
  items: readonly TravelRecordItem[];
};

const recordIcons: Record<TravelRecordItem["id"], IconType> = {
  trips: TbCalendarMonth,
  reviews: TbMessageDots,
  favorites: TbHeart,
  visited: TbMapPin,
};

function TravelRecordSummary({ items }: TravelRecordSummaryProps) {
  return (
    <section className="rounded-[1.5rem] bg-card px-5 py-4 shadow-floating">
      <h2 className="text-[1rem] font-bold leading-6 tracking-[-0.02em] text-foreground">
        나의 여행 기록
      </h2>
      <ul
        aria-label="나의 여행 기록"
        className="mt-3 grid grid-cols-4 gap-1"
      >
        {items.map((item) => {
          const Icon = recordIcons[item.id];
          const content = (
            <>
              <Icon
                aria-hidden="true"
                className="mx-auto size-7 text-muted-foreground"
                strokeWidth={1.6}
              />
              <p className="mt-1.5 truncate text-[0.78rem] font-semibold leading-4 text-foreground">
                {item.label}
              </p>
              <strong className="mt-0.5 block text-[0.8rem] font-bold leading-4 text-primary">
                {item.countLabel}
              </strong>
            </>
          );

          return (
            <li key={item.id} className="min-w-0 text-center">
              {item.href ? (
                <Link
                  href={item.href}
                  className="block rounded-xl py-1 outline-none transition-colors hover:bg-primary-subtle focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export { TravelRecordSummary, type TravelRecordSummaryProps };
