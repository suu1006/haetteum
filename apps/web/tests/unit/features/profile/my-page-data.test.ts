import { describe, expect, it } from "vitest";

import {
  createMyPageData,
  isAllowedKakaoProfileImageUrl,
} from "@/features/profile/my-page-data";

const user = {
  id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  displayName: "실제 카카오 여행자",
  profileImageUrl: "https://k.kakaocdn.net/dn/profile.jpg",
  provider: "KAKAO" as const,
};

describe("createMyPageData", () => {
  it("maps only the actual Kakao profile and actual or unimplemented counts", () => {
    const data = createMyPageData(user, {
      reviewCount: 3,
      favoriteCount: 2,
      tripCount: 1,
    });

    expect(data.profile).toEqual({
      nickname: "실제 카카오 여행자",
      authLabel: "카카오로 로그인됨",
      image: {
        src: "https://k.kakaocdn.net/dn/profile.jpg",
        alt: "실제 카카오 여행자 프로필",
      },
    });
    expect(data.travelRecords).toEqual([
      { id: "trips", label: "내 일정", countLabel: "1개", href: "/trips" },
      { id: "reviews", label: "내 후기", countLabel: "3개", href: "/reviews" },
      {
        id: "favorites",
        label: "찜한 장소",
        countLabel: "2개",
        href: "/reviews?tab=bookmarked",
      },
      { id: "visited", label: "방문한 장소", countLabel: "0개" },
    ]);
    expect(data.profile).not.toHaveProperty("levelLabel");
    expect(data.profile).not.toHaveProperty("pointsLabel");
    expect(data.profile).not.toHaveProperty("progressPercent");
  });

  it("labels an email-signup user as signed in with email, not Kakao", () => {
    const emailUser = { ...user, provider: "EMAIL" as const };

    expect(createMyPageData(emailUser, {}).profile.authLabel).toBe(
      "이메일로 로그인됨",
    );
  });

  it("keeps the favorites destination but omits its unavailable count", () => {
    expect(
      createMyPageData(user, {}).travelRecords.find(
        ({ id }) => id === "favorites",
      ),
    ).toEqual({
      id: "favorites",
      label: "찜한 장소",
      href: "/reviews?tab=bookmarked",
    });
  });

  it("keeps a truthful zero for a ready empty review result", () => {
    expect(createMyPageData(user, { reviewCount: 0 }).travelRecords).toContainEqual({
      id: "reviews",
      label: "내 후기",
      countLabel: "0개",
      href: "/reviews",
    });
  });

  it("keeps the review destination but omits its unavailable count", () => {
    expect(
      createMyPageData(user, {}).travelRecords.find(({ id }) => id === "reviews"),
    ).toEqual({
      id: "reviews",
      label: "내 후기",
      href: "/reviews",
    });
  });

  it("keeps the trips destination but omits its unavailable count", () => {
    expect(
      createMyPageData(user, {}).travelRecords.find(({ id }) => id === "trips"),
    ).toEqual({
      id: "trips",
      label: "내 일정",
      href: "/trips",
    });
  });

  it.each([
    null,
    "http://k.kakaocdn.net/profile.jpg",
    "https://evil.example/profile.jpg",
    "https://k.kakaocdn.net.evil.example/profile.jpg",
    "not-a-url",
  ])("uses the local avatar fallback for an unapproved profile URL: %s", (profileImageUrl) => {
    expect(createMyPageData({ ...user, profileImageUrl }, {}).profile.image.src).toBe(
      "/images/profile/haetteumi-avatar.png",
    );
  });
});

describe("isAllowedKakaoProfileImageUrl", () => {
  it.each([
    "https://k.kakaocdn.net/profile.jpg",
    "https://img.k.kakaocdn.net/profile.jpg",
    "https://deep.img.kakaocdn.net/profile.jpg",
  ])("allows HTTPS Kakao CDN hosts: %s", (url) => {
    expect(isAllowedKakaoProfileImageUrl(url)).toBe(true);
  });

  it.each([
    "http://k.kakaocdn.net/profile.jpg",
    "https://kakaocdn.net/profile.jpg",
    "https://notkakaocdn.net/profile.jpg",
    "https://k.kakaocdn.net.evil.example/profile.jpg",
    "https://k.kakaocdn.net:444/profile.jpg",
    "https://user@k.kakaocdn.net/profile.jpg",
    "data:image/png;base64,abc",
  ])("rejects non-HTTPS or deceptive profile hosts: %s", (url) => {
    expect(isAllowedKakaoProfileImageUrl(url)).toBe(false);
  });
});
