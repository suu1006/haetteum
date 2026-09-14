"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu } from "@/components/ui/menu/menu";
import { TbDotsVertical } from "react-icons/tb";
import type { PlaceReviewItem, ReviewReportRequest } from "@haetteum/contracts";
import { Button } from "@/components/ui/button/button";
import { mutateModeration } from "@/features/reviews/moderation-api";

export function ReviewModerationActions({
  review,
  placeId,
  onBlocked,
  children,
}: {
  review: PlaceReviewItem;
  placeId: string;
  onBlocked: () => void;
  children: (parts: { menu: ReactNode; panel: ReactNode }) => ReactNode;
}) {
  const id = useId();
  const [mode, setMode] = useState<"menu" | "report" | "block">("menu");
  const [reason, setReason] = useState<ReviewReportRequest["reason"]>("SPAM");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [reported, setReported] = useState(false);
  if (review.moderation === "own") return children({ menu: null, panel: null });
  const changeMode = (value: typeof mode) => {
    setError("");
    setMode(value);
  };
  async function submit(action: "reports" | "block-author") {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      await mutateModeration(
        `/reviews/${encodeURIComponent(review.id)}/${action}`,
        "POST",
        action === "reports" ? { reason, details } : undefined,
      );
      if (action === "reports") {
        setReported(true);
        setMode("menu");
      } else onBlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const menu = (
    <Menu.Root>
      <Menu.Trigger aria-label="후기 메뉴" className="size-8">
        <TbDotsVertical
          aria-hidden="true"
          className="size-5"
          strokeWidth={1.7}
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={4}
          className="isolate z-50"
        >
          <Menu.Popup className="min-w-36">
            {review.moderation !== "available" ? (
              <Menu.Item
                render={
                  <Link
                    href={`/login?returnTo=${encodeURIComponent(`/places/${placeId}?tab=reviews`)}`}
                  />
                }
                className="text-primary"
              >
                로그인 후 신고·차단하기
              </Menu.Item>
            ) : (
              <>
                <Menu.Item
                  disabled={reported}
                  onClick={() => changeMode("report")}
                  className="focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  신고하기
                </Menu.Item>
                <Menu.Item
                  onClick={() => changeMode("block")}
                  className="text-destructive"
                >
                  작성자 차단
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );

  const showPanel =
    review.moderation === "available" &&
    (mode === "report" || mode === "block" || reported || error);

  const panel = showPanel ? (
    <div className="mt-2 space-y-3 rounded-lg border border-border bg-card px-3 py-3">
      {mode === "report" && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit("reports");
          }}
        >
          <p className="type-body-md">
            신고 내용은 검토를 위해 저장되며 작성자에게 공개되지 않아요.
          </p>
          <label className="block type-label" htmlFor={`${id}-reason`}>
            신고 사유
          </label>
          <select
            id={`${id}-reason`}
            value={reason}
            disabled={pending}
            onChange={(e) =>
              setReason(e.target.value as ReviewReportRequest["reason"])
            }
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
          >
            <option value="SPAM">광고·스팸</option>
            <option value="ABUSE">욕설·괴롭힘</option>
            <option value="INAPPROPRIATE">부적절한 내용</option>
            <option value="PERSONAL_INFO">개인정보 노출</option>
            <option value="OTHER">기타</option>
          </select>
          <label className="block type-label" htmlFor={`${id}-details`}>
            상세 내용 (선택)
          </label>
          <textarea
            id={`${id}-details`}
            value={details}
            disabled={pending}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full rounded-lg border border-border bg-background p-3"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "접수 중…" : "신고 접수"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => changeMode("menu")}
            >
              취소
            </Button>
          </div>
        </form>
      )}
      {mode === "block" && (
        <div className="space-y-3">
          <p className="type-body-md">
            {review.author.displayName}님의 후기를 내 화면에서 숨길까요?
            마이페이지의 차단한 사용자에서 해제할 수 있어요.
          </p>
          <div className="flex gap-2">
            <Button
              disabled={pending}
              onClick={() => void submit("block-author")}
            >
              {pending ? "차단 중…" : "차단하기"}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => changeMode("menu")}
            >
              취소
            </Button>
          </div>
        </div>
      )}
      {reported && (
        <p role="status" className="type-body-md text-primary">
          신고가 접수되었어요.
        </p>
      )}
      {error && (
        <p role="alert" className="type-body-md text-destructive">
          {error}
        </p>
      )}
    </div>
  ) : null;

  return children({ menu, panel });
}
