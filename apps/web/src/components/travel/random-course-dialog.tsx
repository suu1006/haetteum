"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { useRef, useState } from "react";

import type { GeneratedCourseStop } from "@haetteum/contracts";

import {
  GeneratedCourseStopCard,
  ROLE_LABELS,
} from "@/components/patterns/generated-course-stop-list";
import { LiveGeneratedCourseMap } from "@/components/patterns/live-generated-course-map";

export type RandomCoursePhase = "loading" | "ready" | "empty";

type RandomCourseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: RandomCoursePhase;
  stops: GeneratedCourseStop[];
  startTitle: string | null;
  onRetry: () => void;
};

function RandomCourseDialog({
  open,
  onOpenChange,
  phase,
  stops,
  startTitle,
  onRetry,
}: RandomCourseDialogProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stopsForIndex, setStopsForIndex] = useState(stops);
  const labels = { ...ROLE_LABELS, anchor: "출발지" };

  // 새로 추천받은 코스로 stops가 바뀌면 렌더링 중에 활성 경유지를 첫 번째로 되돌린다.
  if (stops !== stopsForIndex) {
    setStopsForIndex(stops);
    setActiveIndex(0);
  }

  const activeStop = stops[activeIndex] ?? null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-180 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <Dialog.Popup
            ref={popupRef}
            initialFocus={popupRef}
            className="relative my-auto w-full max-w-[28rem] rounded-[1.75rem] border border-white/70 bg-card p-4 text-foreground shadow-floating outline-none transition-[transform,opacity] duration-180 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0"
          >
            <Dialog.Close
              aria-label="닫기"
              className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              <XIcon aria-hidden="true" className="size-5" />
            </Dialog.Close>

            <Dialog.Title className="type-title-md text-center">
              {phase === "ready" && startTitle
                ? `${startTitle} 근처 코스`
                : "랜덤 코스 추천"}
            </Dialog.Title>
            <Dialog.Description className="type-caption mt-1 text-center text-muted-foreground">
              가까운 명소·카페·맛집을 순서대로 묶어봤어요.
            </Dialog.Description>

            {phase === "loading" ? (
              <p
                role="status"
                className="type-body-md mt-8 mb-4 text-center text-muted-foreground"
              >
                코스를 찾는 중이에요…
              </p>
            ) : null}

            {phase === "empty" ? (
              <div className="mt-8 mb-4 text-center">
                <p className="type-body-md text-muted-foreground">
                  지금은 추천할 코스를 찾지 못했어요.
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="type-label mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-primary-foreground outline-none transition-colors hover:bg-primary-pressed focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  다시 추천받기
                </button>
              </div>
            ) : null}

            {phase === "ready" && activeStop ? (
              <>
                <LiveGeneratedCourseMap
                  stops={stops}
                  heightPx={180}
                  activeIndex={activeIndex}
                  onActiveIndexChange={setActiveIndex}
                />
                <p className="type-caption mt-2 text-center text-muted-foreground">
                  {activeIndex + 1} / {stops.length}
                </p>
                <div className="mt-2 grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                  <span className="type-caption mt-1 flex size-7 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                    {activeStop.sequence}
                  </span>
                  <div className="pt-1">
                    <GeneratedCourseStopCard
                      stop={activeStop}
                      roleLabel={labels[activeStop.role]}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRetry}
                  className="type-label mt-4 min-h-11 w-full rounded-xl border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  다른 코스 추천받기
                </button>
              </>
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { RandomCourseDialog };
