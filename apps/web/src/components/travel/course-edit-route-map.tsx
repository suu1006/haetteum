"use client";

import { useEffect, useRef } from "react";
import { Map, MapMarker, Polyline, useKakaoLoader } from "react-kakao-maps-sdk";

import type { CoursePlace } from "@/features/courses/course-edit-model";

const FALLBACK_ROUTE_LINE_COLOR = "#5b21b6";
const DEFAULT_HEIGHT_PX = 200;

type CourseEditRouteMapProps = {
  places: readonly CoursePlace[];
  heightPx?: number;
};

function CourseEditRouteMap({
  places,
  heightPx = DEFAULT_HEIGHT_PX,
}: CourseEditRouteMapProps) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "",
  });
  const mapRef = useRef<kakao.maps.Map | null>(null);

  const validPlaces = places.filter(
    (place): place is CoursePlace & { latitude: number; longitude: number } =>
      place.latitude != null && place.longitude != null,
  );
  const path = validPlaces.map((place) => ({
    lat: place.latitude,
    lng: place.longitude,
  }));
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
    // 최초 마운트 시엔 onCreate가 이미 경로에 맞춰 지도를 맞춰주므로,
    // 이후 장소가 추가/삭제되어 경로가 바뀔 때만 다시 맞춘다.
    if (isFirstPathRender.current) {
      isFirstPathRender.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map || path.length === 0) return;
    fitBoundsToPath(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);

  // 키 미설정, SDK 로딩 실패, 좌표 있는 장소가 없는 경우 조용히 숨긴다.
  if (loading || error || path.length === 0) return null;

  const routeLineColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--route-line")
      .trim() || FALLBACK_ROUTE_LINE_COLOR;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border">
      <Map
        center={path[0]}
        level={6}
        style={{ width: "100%", height: `${heightPx}px` }}
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
        {validPlaces.map((place) => (
          <MapMarker
            key={place.id}
            position={{ lat: place.latitude, lng: place.longitude }}
          />
        ))}
      </Map>
    </div>
  );
}

export { CourseEditRouteMap, type CourseEditRouteMapProps };
