import Image from "next/image";
import { ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type WelcomeCourseAccent = "primary" | "reviews" | "route";

const badgeClasses: Record<WelcomeCourseAccent, string> = {
  primary: "bg-primary text-primary-foreground",
  reviews: "bg-destructive text-destructive-foreground",
  route: "bg-welcome-course text-white",
};

interface WelcomeCourseStepCardProps {
  accent: WelcomeCourseAccent;
  badge: string;
  description: string;
  imageAlt: string;
  imageSrc: string;
  isLast?: boolean;
  title: string;
}

function WelcomeCourseStepCard({
  accent,
  badge,
  description,
  imageAlt,
  imageSrc,
  isLast = false,
  title,
}: WelcomeCourseStepCardProps) {
  return (
    <li className="relative min-w-0 flex-1">
      <Card className="h-full gap-0 rounded-2xl border-white/80 bg-white/92 p-2 shadow-floating">
        <div className="relative h-28 overflow-hidden rounded-xl">
          <Image
            alt={imageAlt}
            className="object-cover"
            fill
            sizes="(min-width: 1024px) 12rem, 40vw"
            src={imageSrc}
          />
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-3 py-1 text-xs font-semibold",
              badgeClasses[accent],
            )}
          >
            {badge}
          </span>
        </div>
        <div className="px-2 pb-2 pt-4">
          <h3 className="text-base font-semibold leading-6 text-foreground">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </Card>
      {!isLast && (
        <ChevronRight
          aria-hidden="true"
          className="absolute -right-5 top-1/2 z-10 size-5 -translate-y-1/2 text-white/80"
          strokeWidth={2.6}
        />
      )}
    </li>
  );
}

export { WelcomeCourseStepCard };
export type { WelcomeCourseStepCardProps };
