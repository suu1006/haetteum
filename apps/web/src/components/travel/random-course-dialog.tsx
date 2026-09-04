"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { useRef, useState } from "react";

import type { GeneratedCourseStop } from "@haetteum/contracts";

import { GeneratedCourseStopList } from "@/components/patterns/generated-course-stop-list";
import { LiveGeneratedCourseMap } from "@/components/patterns/live-generated-course-map";

export type RandomCoursePhase = "loading" | "ready" | "empty";
export type SaveCourseState =
  | "idle"
  | "saving"
  | "saved"
  | "canceling"
  | "error";

type RandomCourseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: RandomCoursePhase;
  stops: GeneratedCourseStop[];
  startTitle: string | null;
  onRetry: () => void;
  onSave: () => void;
  onCancelSave: () => void;
  saveState: SaveCourseState;
};

const SAVE_BUTTON_LABEL: Record<SaveCourseState, string> = {
  idle: "일정 저장하기",
  saving: "저장 중…",
  saved: "저장 취소",
  canceling: "취소 중…",
  error: "다시 시도",
};

function RandomCourseDialog({
  open,
  onOpenChange,
  phase,
  stops,
  startTitle,
  onRetry,
  onSave,
  onCancelSave,
  saveState,
}: RandomCourseDialogProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stopsForIndex, setStopsForIndex] = useState(stops);

  // 새로 추천받은 코스로 stops가 바뀌면 렌더링 중에 활성 경유지를 첫 번째로 되돌린다.
  if (stops !== stopsForIndex) {
    setStopsForIndex(stops);
    setActiveIndex(0);
  }

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

            {phase === "ready" && stops.length > 0 ? (
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
                <div className="mt-2">
                  <GeneratedCourseStopList stops={stops} anchorLabel="출발지" />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="type-label min-h-11 flex-1 rounded-xl border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
                  >
                    다른 코스 추천받기
                  </button>
                  <button
                    type="button"
                    onClick={saveState === "saved" ? onCancelSave : onSave}
                    disabled={
                      saveState === "saving" || saveState === "canceling"
                    }
                    className={
                      saveState === "saved" || saveState === "canceling"
                        ? "type-label min-h-11 flex-1 rounded-xl border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-70"
                        : "type-label min-h-11 flex-1 rounded-xl bg-primary text-primary-foreground outline-none transition-colors hover:bg-primary-pressed focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-70"
                    }
                  >
                    {SAVE_BUTTON_LABEL[saveState]}
                  </button>
                </div>
              </>
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { RandomCourseDialog };
