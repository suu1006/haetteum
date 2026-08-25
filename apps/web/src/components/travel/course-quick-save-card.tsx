import { CameraIcon, SparklesIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

function CourseQuickSaveCard() {
  return (
    <article aria-label="짧게 보고 바로 저장" className="h-full">
      <Card className="relative h-full min-h-20 items-center justify-center gap-1.5 border-0 bg-primary px-1.5 py-2 text-center text-primary-foreground shadow-card">
        <SparklesIcon
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 size-3.5 fill-primary-foreground text-primary-foreground"
        />
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary-foreground/15">
          <CameraIcon aria-hidden="true" className="size-4.5" />
        </span>
        <p className="type-caption break-keep font-semibold text-primary-foreground">
          짧게 보고{" "}
          <br />
          바로 저장
        </p>
      </Card>
    </article>
  );
}

export { CourseQuickSaveCard };
