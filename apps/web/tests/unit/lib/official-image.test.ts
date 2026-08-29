import { describe, expect, it } from "vitest";

import {
  fallbackOfficialImageSrc,
  resolveOfficialImageSource,
} from "@/lib/official-image";

describe("resolveOfficialImageSource", () => {
  it("upgrades an http provider image to https", () => {
    expect(
      resolveOfficialImageSource(
        "http://tong.visitkorea.or.kr/cms/resource/89/3544389_image2_1.jpg",
      ),
    ).toBe("https://tong.visitkorea.or.kr/cms/resource/89/3544389_image2_1.jpg");
  });

  it("keeps an https provider image unchanged", () => {
    const src = "https://upload.wikimedia.org/wikipedia/commons/a/b.jpg";
    expect(resolveOfficialImageSource(src)).toBe(src);
  });

  it("falls back for a missing, unapproved, or malformed source", () => {
    expect(resolveOfficialImageSource(null)).toBe(fallbackOfficialImageSrc);
    expect(resolveOfficialImageSource("https://example.com/a.jpg")).toBe(
      fallbackOfficialImageSrc,
    );
    expect(
      resolveOfficialImageSource("https://tong.visitkorea.or.kr:8080/a.jpg"),
    ).toBe(fallbackOfficialImageSrc);
    expect(
      resolveOfficialImageSource("https://tong.visitkorea.or.kr/a.jpg?token=1"),
    ).toBe(fallbackOfficialImageSrc);
    expect(resolveOfficialImageSource("not-a-url")).toBe(
      fallbackOfficialImageSrc,
    );
  });
});
