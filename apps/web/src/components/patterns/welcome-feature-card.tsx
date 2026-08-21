import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type WelcomeFeatureAccent = "ranking" | "course" | "reviews";

const accentClasses: Record<WelcomeFeatureAccent, string> = {
  ranking: "bg-welcome-ranking",
  course: "bg-welcome-course",
  reviews: "bg-welcome-reviews",
};

interface WelcomeFeatureCardProps {
  accent: WelcomeFeatureAccent;
  description: ReactNode;
  icon: LucideIcon;
  title: string;
}

function WelcomeFeatureCard({
  accent,
  description,
  icon: Icon,
  title,
}: WelcomeFeatureCardProps) {
  return (
    <Card
      aria-label={title}
      className="flex-row items-center gap-4 rounded-2xl border-white/55 bg-welcome-glass px-4 py-3 shadow-floating backdrop-blur-xl"
      role="article"
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex size-13 shrink-0 items-center justify-center rounded-2xl text-white shadow-card",
          accentClasses[accent],
        )}
      >
        <Icon className="size-7" strokeWidth={2.4} />
      </div>
      <div className="min-w-0">
        <CardTitle className="text-base leading-6">{title}</CardTitle>
        <CardDescription className="mt-0.5 max-w-48 text-sm leading-5 text-muted-foreground">
          {description}
        </CardDescription>
      </div>
    </Card>
  );
}

export { WelcomeFeatureCard };
export type { WelcomeFeatureCardProps };
