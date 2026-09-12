"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Maximize2Icon, XIcon } from "lucide-react";
import {
  CustomOverlayMap,
  Map,
  Polyline,
  useKakaoLoader,
} from "react-kakao-maps-sdk";

import { getKakaoJsKey } from "@/lib/environment-contract";

import type { GeneratedCourseStop } from "@haetteum/contracts";

const FALLBACK_ROUTE_LINE_COLOR = "#5b21b6";
const DEFAULT_HEIGHT_PX = 160;

type LatLng = { lat: number; lng: number };

type RouteMapCanvasProps = {
  stops: readonly GeneratedCourseStop[];
  path: LatLng[];
  routeLineColor: string;
  style: CSSProperties;
};

function RouteMapCanvas({ stops, path, routeLineColor, style }: RouteMapCanvasProps) {
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const pathKey = path.map(({ lat, lng }) => `${lat},${lng}`).join("|");
  const isFirstPathRender = useRef(true);

  function fitBoundsToPath(map: kakao.maps.Map) {
    // 지도 컨테이너가 아직 레이아웃을 잡기 전에 setBounds를 호출하면
    // 컨테이너 크기를 0으로 오인해 지도가 국가 단위로 줌아웃된다.
    requestAnimationFrame(() => {
      map.relayout();
      if (path.length === 1) {
        map.setCenter(new kakao.maps.LatLng(path[0].lat, path[0].lng));
        return;
      }
      const bounds = new kakao.maps.LatLngBounds();
      for (const point of path) {
        bounds.extend(new kakao.maps.LatLng(point.lat, point.lng));
      }
      map.setBounds(bounds, 32);
    });
  }

  useEffect(() => {
    if (isFirstPathRender.current) {
      isFirstPathRender.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map || path.length === 0) return;
    fitBoundsToPath(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);

  return (
    <Map
      center={path[0]}
      level={6}
      style={style}
      onCreate={(map) => {
        mapRef.current = map;
        fitBoundsToPath(map);
      }}
    >
      {path.length > 1 ? (
        <Polyline
          path={path}
          strokeWeight={3}
          strokeColor={routeLineColor}
          strokeOpacity={0.8}
          strokeStyle="solid"
        />
      ) : null}
      {stops.map((stop) => (
        <CustomOverlayMap
          key={`${stop.role}-${stop.sequence}`}
          position={{ lat: stop.latitude, lng: stop.longitude }}
          zIndex={stop.sequence}
        >
          <span className="type-caption flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary font-bold text-primary-foreground shadow-sm">
            {stop.sequence}
          </span>
        </CustomOverlayMap>
      ))}
    </Map>
  );
}

type SavedCourseRouteMapProps = {
  stops: readonly GeneratedCourseStop[];
  heightPx?: number;
};

function SavedCourseRouteMap({
  stops,
  heightPx = DEFAULT_HEIGHT_PX,
}: SavedCourseRouteMapProps) {
  const [loading, error] = useKakaoLoader({
    appkey: getKakaoJsKey() ?? "",
  });
  const [expanded, setExpanded] = useState(false);

  const path = stops.map((stop) => ({ lat: stop.latitude, lng: stop.longitude }));

  // 키 미설정, SDK 로딩 실패, 좌표 있는 장소가 없는 경우 조용히 숨긴다.
  if (loading || error || path.length === 0) return null;

  const routeLineColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--route-line")
      .trim() || FALLBACK_ROUTE_LINE_COLOR;

  return (
    <>
      <div className="relative mb-3 overflow-hidden rounded-xl border border-border">
        <RouteMapCanvas
          stops={stops}
          path={path}
          routeLineColor={routeLineColor}
          style={{ width: "100%", height: `${heightPx}px` }}
        />
        <button
          type="button"
          aria-label="지도 크게 보기"
          onClick={() => setExpanded(true)}
          className="absolute top-2 right-2 z-30 flex size-9 items-center justify-center rounded-full bg-card/95 text-foreground shadow-card outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <Maximize2Icon aria-hidden="true" className="size-4.5" />
        </button>
      </div>

      <Dialog.Root open={expanded} onOpenChange={setExpanded}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-180 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Popup className="relative flex h-[calc(100dvh-2rem)] w-full max-w-[30rem] flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-card text-foreground shadow-floating outline-none transition-[transform,opacity] duration-180 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 pt-5 pb-4">
                <Dialog.Title className="type-title-md text-foreground">
                  전체 동선 보기
                </Dialog.Title>
                <Dialog.Close
                  aria-label="닫기"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  <XIcon aria-hidden="true" className="size-5" />
                </Dialog.Close>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border mx-4 mb-4">
                {expanded ? (
                  <RouteMapCanvas
                    stops={stops}
                    path={path}
                    routeLineColor={routeLineColor}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : null}
              </div>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export { SavedCourseRouteMap, type SavedCourseRouteMapProps };
