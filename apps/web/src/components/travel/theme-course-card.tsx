import Image from "next/image";
import {
  BookmarkIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  MapPinIcon,
  StarIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  ThemeCourse,
  ThemeId,
} from "@/features/themes/theme-travel-model";
import { cn } from "@/lib/utils";

type ThemeCourseCardProps = {
  course: ThemeCourse;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
  eager?: boolean;
};

const themePresentation: Record<
  Exclude<ThemeId, "all">,
  { label: string; className: string }
> = {
  healing: {
    label: "힐링 & 휴식",
    className: "bg-theme-food/10 text-theme-food",
  },
  food: {
    label: "미식 여행",
    className: "bg-theme-healing/10 text-theme-healing",
  },
  culture: {
    label: "문화 & 역사",
    className: "bg-theme-culture/10 text-theme-culture",
  },
  activity: {
    label: "액티비티",
    className: "bg-theme-activity/10 text-theme-activity",
  },
  family: {
    label: "가족 여행",
    className: "bg-theme-family/10 text-theme-family",
  },
};

function ThemeCourseCard({
  course,
  saved,
  onSavedChange,
  eager = false,
}: ThemeCourseCardProps) {
  const presentation = themePresentation[course.theme];
  const saveLabel = saved
    ? `${course.title} 저장 취소`
    : `${course.title} 저장`;

  return (
    <Card
      role="article"
      aria-label={course.title}
      className="grid min-h-[8.25rem] grid-cols-[6.75rem_minmax(0,1fr)] gap-2 p-1.5 py-1.5 shadow-card max-[359px]:grid-cols-[5.5rem_minmax(0,1fr)]"
    >
      <div className="relative min-h-full overflow-hidden rounded-lg bg-primary-subtle">
        <Image
          src={course.image.src}
          alt={course.image.alt}
          fill
          sizes="(max-width: 359px) 100px, 116px"
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-col pr-1">
        <div className="flex min-w-0 items-start gap-1">
          <Badge
            variant="secondary"
            className={cn("mt-0.5 shrink-0 border-0", presentation.className)}
          >
            {presentation.label}
          </Badge>
          <h3 className="type-label min-w-0 flex-1 truncate text-foreground">
            {course.title}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={saveLabel}
            aria-pressed={saved}
            onClick={() => onSavedChange(!saved)}
            className="-mt-1 -mr-1 shrink-0 rounded-full text-muted-foreground aria-pressed:text-primary"
          >
            <BookmarkIcon
              aria-hidden="true"
              className={cn("size-5", saved && "fill-primary")}
            />
          </Button>
        </div>

        <p className="type-caption mt-0.5 line-clamp-1 text-muted-foreground">
          {course.description}
        </p>

        <dl className="type-caption mt-1 flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <div className="flex shrink-0 items-center gap-1">
            <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">일정</dt>
            <dd>{course.durationLabel}</dd>
          </div>
          <span className="h-3 w-px bg-border" aria-hidden="true" />
          <div className="flex min-w-0 items-center gap-1">
            <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">지역</dt>
            <dd className="truncate">{course.locationLabel}</dd>
          </div>
        </dl>

        <div className="mt-auto flex min-w-0 items-end justify-between gap-1.5 pt-1">
          <ul aria-label={`${course.title} 태그`} className="flex min-w-0 gap-1 overflow-hidden">
            {course.tags.map((tag) => (
              <li key={tag}>
                <Badge
                  variant="secondary"
                  className="border-0 bg-secondary font-normal text-muted-foreground"
                >
                  #{tag}
                </Badge>
              </li>
            ))}
          </ul>
          <div
            aria-label={`평점 ${course.rating.toFixed(1)}점, 후기 ${course.reviewCount}개`}
            className="type-caption flex shrink-0 items-center gap-1 text-primary"
          >
            <StarIcon className="size-3.5 fill-primary" aria-hidden="true" />
            <span className="font-semibold">{course.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({course.reviewCount.toLocaleString("ko-KR")})</span>
            <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export { ThemeCourseCard, type ThemeCourseCardProps };
