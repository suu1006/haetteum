import Link from "next/link";
import {
  ChevronRightIcon,
  FlameIcon,
  PlayIcon,
  SparklesIcon,
} from "lucide-react";
import { useId, type ReactNode } from "react";

import { PopularVideoRail } from "@/components/travel/popular-video-rail";
import {
  TravelThemeItem,
  TravelThemeMoreItem,
} from "@/components/travel/travel-theme-item";
import { VideoCourseCard } from "@/components/travel/video-course-card";
import {
  buildDiscoveryHref,
  type DiscoveryQuery,
  type PopularVideoItem,
  type TravelThemeItem as TravelThemeItemData,
  type VideoCourseItem,
} from "@/features/discovery/discovery-model";

type PopularPlacesTabProps = {
  videos: readonly PopularVideoItem[];
  themes: readonly TravelThemeItemData[];
  courses: readonly VideoCourseItem[];
  query: DiscoveryQuery;
};

type SectionHeadingProps = {
  id: string;
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

function SectionHeading({
  id,
  title,
  description,
  icon,
  action,
}: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {icon}
          <h2 id={id} className="type-body-lg font-semibold text-foreground">
            {title}
          </h2>
        </div>
        <p className="type-caption mt-0.5 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function VideoBrowseAction({ videoId }: { videoId: string }) {
  return (
    <Link
      href={`/reels/${videoId}`}
      scroll={false}
      className="type-caption inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-primary/35 bg-card px-3 font-semibold text-primary outline-none transition-colors hover:bg-primary-subtle focus-visible:ring-3 focus-visible:ring-ring/25 active:scale-[0.98]"
    >
      <PlayIcon aria-hidden="true" className="size-3.5 fill-primary" />
      영상으로 둘러보기
    </Link>
  );
}

function MoreVisualAction() {
  return (
    <span className="type-caption inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full border border-primary/25 bg-card px-2.5 font-semibold text-primary">
      더보기
      <ChevronRightIcon aria-hidden="true" className="size-3.5" />
    </span>
  );
}

function PopularPlacesTab({
  videos,
  themes,
  courses,
  query,
}: PopularPlacesTabProps) {
  const headingIdPrefix = useId();
  const popularVideosTitleId = `${headingIdPrefix}-popular-videos-title`;
  const travelThemesTitleId = `${headingIdPrefix}-travel-themes-title`;
  const videoCoursesTitleId = `${headingIdPrefix}-video-courses-title`;

  return (
    <div id="places" aria-label="인기 관광지" className="space-y-4 pt-4">
      <section
        aria-labelledby={popularVideosTitleId}
        data-testid="popular-place-section"
        data-section="popular-videos"
        className="px-4"
      >
        <SectionHeading
          id={popularVideosTitleId}
          title="릴스형 인기 관광지"
          description="짧은 미리보기로 여행지를 만나보세요."
          icon={
            <FlameIcon
              aria-hidden="true"
              className="size-4.5 fill-destructive text-destructive"
            />
          }
          action={
            videos[0] ? <VideoBrowseAction videoId={videos[0].id} /> : undefined
          }
        />
        {videos.length > 0 ? (
          <PopularVideoRail videos={videos} />
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
            <p className="type-body-md text-muted-foreground">
              조건에 맞는 인기 관광지를 찾지 못했어요.
            </p>
            <Link
              href={buildDiscoveryHref(query, { q: "" }, "places")}
              className="type-label mt-3 inline-flex text-primary underline-offset-4 hover:underline"
            >
              검색어 지우기
            </Link>
          </div>
        )}
      </section>

      <section
        aria-labelledby={travelThemesTitleId}
        data-testid="popular-place-section"
        data-section="travel-themes"
        className="px-4"
      >
        <h2 id={travelThemesTitleId} className="sr-only">
          여행 테마
        </h2>
        <ul
          aria-label="여행 테마"
          className="scrollbar-none flex gap-2 overflow-x-auto pb-1"
        >
          {themes.map((theme) => (
            <li key={theme.id}>
              <TravelThemeItem theme={theme} />
            </li>
          ))}
          <li>
            <TravelThemeMoreItem />
          </li>
        </ul>
      </section>

      <section
        aria-labelledby={videoCoursesTitleId}
        data-testid="popular-place-section"
        data-section="video-courses"
        className="px-4"
      >
        <SectionHeading
          id={videoCoursesTitleId}
          title="지금 뜨는 영상 코스"
          description="짧은 영상처럼 빠르게 코스를 살펴보세요."
          icon={
            <SparklesIcon
              aria-hidden="true"
              className="size-4 fill-primary text-primary"
            />
          }
          action={<MoreVisualAction />}
        />
        {courses.length > 0 ? (
          <ul
            aria-label="지금 뜨는 영상 코스 목록"
            className="mt-2.5 grid grid-cols-2 gap-2"
          >
            {courses.map((course) => (
              <li key={course.id}>
                <VideoCourseCard course={course} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body-md mt-4 text-muted-foreground">
            조건에 맞는 영상 코스가 없어요.
          </p>
        )}
      </section>
    </div>
  );
}

export { PopularPlacesTab, type PopularPlacesTabProps };
