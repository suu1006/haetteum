"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef, useState } from "react";
import { Loader2Icon, RotateCcwIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseEditRouteMap } from "@/components/travel/course-edit-route-map";
import { loadNearbyPlaces } from "@/features/places/place-detail-api";
import { toCoursePlaceFromGeneratedStop, type CoursePlace, type CourseTimeSlot } from "./course-edit-model";
import { courseDistance, replaceCoursePlaces, shortenCourse } from "./course-alternatives";

type Props = {
  places: readonly CoursePlace[];
  slots: readonly CourseTimeSlot[];
  onApply: (places: readonly CoursePlace[]) => void;
  disabled: boolean;
};

export function CourseAlternativeDialog({ places, slots, onApply, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<readonly CoursePlace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef(0);
  const popup = useRef<HTMLDivElement>(null);
  const seen = useRef<CoursePlace[]>([]);
  useEffect(() => () => { request.current++; }, []);

  function changeOpen(value: boolean) {
    request.current++;
    seen.current = [];
    setOpen(value);
    setPreview(null);
    setMessage("");
    setLoading(false);
  }

  async function recommend(kind: "order" | "places") {
    const currentRequest = ++request.current;
    setPreview(null);
    setMessage("");
    if (kind === "order") {
      const next = shortenCourse(places);
      setPreview(next);
      if (!next) setMessage("현재보다 짧은 동선을 찾지 못했어요. 새 장소를 포함해서 추천받아보세요.");
      return;
    }
    const anchor = places.find(place => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(place.id));
    if (!anchor || places.length < 2) {
      setMessage("주변 추천을 위한 장소 정보가 부족해요. 장소를 추가한 뒤 다시 시도해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const responses = await Promise.all(
        (["attraction", "cafe", "restaurant"] as const).map(category => loadNearbyPlaces(anchor.id, category)),
      );
      if (request.current !== currentRequest) return;
      const candidates = responses.flatMap(response => response.status === "ready" ? response.items : [])
        .map((item, index) => ({
          ...toCoursePlaceFromGeneratedStop({
            role: "attraction", sequence: index + 1, placeId: null,
            title: item.title, categoryLabel: item.categoryLabel,
            address: item.roadAddress ?? item.address, latitude: item.latitude,
            longitude: item.longitude, distanceMeters: item.distanceMeters, placeUrl: item.placeUrl,
          }),
          id: `nearby-${item.providerPlaceId}`,
        }));
      // Previously previewed candidates are excluded to make repeated requests useful.
      const fresh = candidates.filter(candidate => !seen.current.some(p => p.id === candidate.id));
      const next = replaceCoursePlaces(places, fresh);
      setPreview(next);
      if (next) seen.current.push(...next.filter(p => !places.some(original => original.id === p.id)));
      else setMessage(responses.every(response => response.status === "unavailable")
        ? "주변 장소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
        : "새롭게 추천할 주변 장소가 없어요. 기존 코스를 유지하거나 장소를 직접 추가해 주세요.");
    } catch {
      if (request.current === currentRequest) setMessage("추천을 불러오지 못했어요. 다시 시도해 주세요.");
    } finally {
      if (request.current === currentRequest) setLoading(false);
    }
  }

  const beforeDistance = courseDistance(places);
  const afterDistance = preview ? courseDistance(preview) : null;
  const changedCount = preview?.filter(p => !places.some(original => original.id === p.id)).length ?? 0;

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger disabled={disabled} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/35 bg-primary-subtle/40 px-4 font-semibold text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50">
        <RotateCcwIcon className="size-5" aria-hidden="true" />
        다른 코스 추천받기
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
          <Dialog.Popup ref={popup} initialFocus={popup} className="safe-area-bottom relative max-h-[90svh] w-full max-w-[30rem] overflow-y-auto rounded-t-3xl bg-card px-5 pt-6 pb-6 text-foreground shadow-floating outline-none">
            <Dialog.Close aria-label="닫기" className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full hover:bg-secondary">
              <XIcon className="size-5" aria-hidden="true" />
            </Dialog.Close>
            <Dialog.Title className="type-title-md pr-10">다른 코스 추천받기</Dialog.Title>
            <Dialog.Description className="type-body-md mt-2 text-muted-foreground">
              출발 장소와 시간표를 유지해요. 새 코스를 확인한 뒤 변경해 주세요.
            </Dialog.Description>
            {!preview && !loading ? (
              <div className="mt-5 grid gap-3">
                <Button variant="outline" className="h-auto min-h-16 flex-col items-start gap-1 whitespace-normal px-4 py-3" onClick={() => void recommend("order")}>
                  <span>기존 장소 유지</span>
                  <span className="text-xs font-normal text-muted-foreground">방문 순서를 조정해 이동 거리 줄이기</span>
                </Button>
                <Button variant="outline" className="h-auto min-h-16 flex-col items-start gap-1 whitespace-normal px-4 py-3" onClick={() => void recommend("places")}>
                  <span>새 장소 포함</span>
                  <span className="text-xs font-normal text-muted-foreground">주변의 다른 명소·카페·맛집 추천받기</span>
                </Button>
              </div>
            ) : null}
            {loading ? <p role="status" className="flex items-center justify-center gap-2 py-12"><Loader2Icon className="size-5 animate-spin" aria-hidden="true" />다른 코스를 찾고 있어요…</p> : null}
            {message ? <p role="status" className="mt-4 rounded-xl bg-secondary p-4 text-sm">{message}</p> : null}
            {preview ? (
              <div className="mt-5">
                <p className="mb-3 text-sm font-semibold text-primary">{changedCount ? `새 장소 ${changedCount}곳 포함` : "같은 장소, 더 짧은 동선"}</p>
                <CourseEditRouteMap places={preview} heightPx={160} />
                {beforeDistance != null && afterDistance != null ? <p className="my-3 text-xs text-muted-foreground">직선거리 합계 {(beforeDistance / 1000).toFixed(1)}km → {(afterDistance / 1000).toFixed(1)}km · 실제 이동 경로와 달라요.</p> : null}
                <ol aria-label="새 코스 미리보기" className="my-4 space-y-3">
                  {preview.map((place, index) => <li key={place.id} className="flex items-start gap-3 text-sm"><span className="shrink-0 text-muted-foreground">{slots[index]?.time}</span><span>{place.title}{!places.some(p => p.id === place.id) ? <span className="ml-2 text-xs text-primary">새 장소</span> : null}</span></li>)}
                </ol>
                <Button className="w-full" onClick={() => { onApply(preview); changeOpen(false); }}>이 코스로 변경</Button>
                <Button variant="ghost" className="mt-2 w-full" onClick={() => setPreview(null)}>다른 방식으로 추천받기</Button>
              </div>
            ) : null}
            <Dialog.Close render={<Button variant="outline" className="mt-3 w-full" />}>기존 코스 유지</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
