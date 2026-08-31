"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Map, MapMarker, Polyline, useKakaoLoader } from "react-kakao-maps-sdk";

import type { GeneratedCourseStop } from "@haetteum/contracts";

const FALLBACK_ROUTE_LINE_COLOR = "#5b21b6";
const DEFAULT_HEIGHT_PX = 320;

type LiveGeneratedCourseMapProps = {
  stops: GeneratedCourseStop[];
  heightPx?: number;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
};

function LiveGeneratedCourseMap({
  stops,
  heightPx = DEFAULT_HEIGHT_PX,
  activeIndex,
  onActiveIndexChange,
}: LiveGeneratedCourseMapProps) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "",
  });
  const mapRef = useRef<kakao.maps.Map | null>(null);
  // 최초 마운트 시엔 onCreate가 이미 전체 경로에 맞춰 지도를 맞춰주므로,
  // 이후 사용자가 화살표로 이동할 때만 개별 경유지로 panTo한다.
  const isFirstActiveIndexRender = useRef(true);

  useEffect(() => {
    if (isFirstActiveIndexRender.current) {
      isFirstActiveIndexRender.current = false;
      return;
    }
    if (activeIndex == null) return;
    const map = mapRef.current;
    const stop = stops[activeIndex];
    if (!map || !stop) return;
    map.panTo(new kakao.maps.LatLng(stop.latitude, stop.longitude));
  }, [activeIndex, stops]);

  // 키 미설정, SDK 로딩 실패, 좌표 없음인 경우 조용히 숨긴다 — 아래 경유지 목록이 대신 안내한다.
  if (loading || error || stops.length === 0) return null;

  const path = stops.map((stop) => ({ lat: stop.latitude, lng: stop.longitude }));
  // 이 시점엔 SDK 로딩이 끝난 클라이언트이므로 안전하게 document에 접근할 수 있다.
  // 캔버스 렌더러는 CSS 변수를 해석하지 못하므로 실제 계산값을 문자열로 읽어 넘긴다.
  const routeLineColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--route-line")
      .trim() || FALLBACK_ROUTE_LINE_COLOR;

  function handlePrev() {
    onActiveIndexChange?.(Math.max(0, (activeIndex ?? 0) - 1));
  }

  function handleNext() {
    onActiveIndexChange?.(Math.min(stops.length - 1, (activeIndex ?? 0) + 1));
  }

  return (
    <div className="relative mx-4 mt-4 overflow-hidden rounded-xl border border-border">
      <Map
        center={path[0]}
        level={5}
        style={{ width: "100%", height: `${heightPx}px` }}
        onCreate={(map) => {
          mapRef.current = map;
          if (path.length < 2) return;
          // 생성 직후엔 컨테이너 레이아웃이 아직 확정되지 않아 relayout 없이 setBounds를
          // 호출하면 컨테이너 크기를 0으로 오인해 지도가 국가 단위로 줌아웃된다.
          requestAnimationFrame(() => {
            map.relayout();
            const bounds = new kakao.maps.LatLngBounds();
            for (const point of path) {
              bounds.extend(new kakao.maps.LatLng(point.lat, point.lng));
            }
            map.setBounds(bounds, 32);
          });
        }}
      >
        <Polyline
          path={path}
          strokeWeight={3}
          strokeColor={routeLineColor}
          strokeOpacity={0.8}
          strokeStyle="solid"
        />
        {stops.map((stop) => (
          <MapMarker
            key={`${stop.role}-${stop.sequence}`}
            position={{ lat: stop.latitude, lng: stop.longitude }}
          />
        ))}
      </Map>
      {onActiveIndexChange ? (
        <>
          <button
            type="button"
            onClick={handlePrev}
            disabled={(activeIndex ?? 0) <= 0}
            aria-label="이전 코스 보기"
            className="absolute top-1/2 left-2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-floating outline-none transition-opacity hover:bg-card disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <ChevronLeftIcon aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={(activeIndex ?? 0) >= stops.length - 1}
            aria-label="다음 코스 보기"
            className="absolute top-1/2 right-2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-floating outline-none transition-opacity hover:bg-card disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <ChevronRightIcon aria-hidden="true" className="size-5" />
          </button>
        </>
      ) : null}
    </div>
  );
}

export { LiveGeneratedCourseMap };
