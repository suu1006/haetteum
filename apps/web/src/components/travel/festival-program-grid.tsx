import {
  CameraIcon,
  CookingPotIcon,
  LandmarkIcon,
  Music2Icon,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type {
  FestivalProgram,
  FestivalProgramIconId,
} from "@/features/festivals/festival-detail-model";

const programIcons = {
  "rice-bowl": CookingPotIcon,
  pavilion: LandmarkIcon,
  performance: Music2Icon,
  camera: CameraIcon,
} satisfies Record<FestivalProgramIconId, LucideIcon>;

type FestivalProgramGridProps = {
  programs: readonly FestivalProgram[];
};

function FestivalProgramGrid({ programs }: FestivalProgramGridProps) {
  return (
    <section aria-labelledby="festival-programs-title">
      <h2 id="festival-programs-title" className="type-title-md text-foreground">
        주요 프로그램
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {programs.map((program) => {
          const Icon = programIcons[program.icon];

          return (
            <li key={program.id}>
              <Card className="h-full gap-0 py-0">
                <CardContent className="flex h-full flex-col items-start gap-3 px-3 py-4">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="type-label text-foreground">{program.title}</h3>
                    <p className="type-caption mt-1.5 text-muted-foreground">
                      {program.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export { FestivalProgramGrid, type FestivalProgramGridProps };
