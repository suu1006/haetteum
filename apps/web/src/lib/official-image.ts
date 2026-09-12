const officialImageHostname = "tong.visitkorea.or.kr";
/** TourAPI에 등록이 없는 장소의 대체 출처. 공공누리/CC 라이선스가 확인된 것만 사용한다. */
const wikimediaImageHostname = "upload.wikimedia.org";
const officialImageHostnames = new Set([
  officialImageHostname,
  wikimediaImageHostname,
]);
const fallbackOfficialImageSrc =
  "/images/explore/categories/popular-attraction.png";

/**
 * TourAPI(또는 Wikimedia Commons) 이미지 URL을 next/image가 허용하는 형태로 정규화한다.
 * 허용된 호스트가 아니거나 허용되지 않는 형태면 대체 이미지를 돌려준다.
 */
function resolveOfficialImageSource(
  imageUrl: string | null | undefined,
  fallbackSrc: string = fallbackOfficialImageSrc,
): string {
  if (!imageUrl) return fallbackSrc;

  try {
    const url = new URL(imageUrl);
    if (!officialImageHostnames.has(url.hostname)) return fallbackSrc;
    if (url.protocol === "http:") {
      url.protocol = "https:";
    }
    if (url.protocol !== "https:" || url.port !== "" || url.search !== "") {
      return fallbackSrc;
    }
    return url.toString();
  } catch {
    return fallbackSrc;
  }
}

export {
  fallbackOfficialImageSrc,
  officialImageHostname,
  officialImageHostnames,
  wikimediaImageHostname,
  resolveOfficialImageSource,
};

/** Actual stored photo URL only; never substitute a generic destination image. */
export function resolvePlacePhotoSource(
  value: string | null | undefined,
): string | null {
  const source = resolveOfficialImageSource(value, "");
  if (!source) return null;
  const url = new URL(source);
  return url.username || url.password || url.hash ? null : source;
}
