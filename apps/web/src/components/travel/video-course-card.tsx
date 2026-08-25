import Image from "next/image";
import { MapPinIcon, PlayIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { VideoCourseItem } from "@/features/discovery/discovery-model";

type VideoCourseCardProps = {
  course: VideoCourseItem;
};

function VideoCourseCard({ course }: VideoCourseCardProps) {
  return (
    <article aria-label={course.title} className="h-full">
      <Card className="h-full gap-0 overflow-hidden border-0 py-0">
        <div className="relative aspect-[5/4] overflow-hidden bg-primary-subtle">
          <Image
            src={course.image.src}
            alt={course.image.alt}
            fill
            sizes="(max-width: 479px) 46vw, 216px"
            className="object-cover"
          />
          <span className="type-caption absolute top-2 right-2 rounded-full bg-foreground/70 px-1.5 py-0.5 font-semibold text-image-foreground">
            {course.durationLabel}
          </span>
          <PlayIcon
            aria-hidden="true"
            className="absolute top-2 left-2 size-5 fill-image-foreground text-image-foreground"
          />
          <div className="absolute inset-x-0 bottom-0 bg-image-scrim px-2 py-1.5 text-image-foreground">
            <h3 className="type-caption line-clamp-1 font-semibold text-image-foreground">
              {course.title}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-[0.625rem] leading-3 text-image-foreground-muted">
              {course.summary}
            </p>
            <p className="mt-0.5 flex min-w-0 items-center gap-0.5 truncate text-[0.625rem] leading-3 text-image-foreground-muted">
              <MapPinIcon aria-hidden="true" className="size-3 shrink-0" />
              <span className="min-w-0 truncate">{course.location}</span>
            </p>
          </div>
        </div>
      </Card>
    </article>
  );
}

export { VideoCourseCard, type VideoCourseCardProps };
