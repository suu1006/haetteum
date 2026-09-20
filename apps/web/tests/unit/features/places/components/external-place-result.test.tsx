import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExternalPlaceResult } from "@/features/places/components/external-place-result";
import { PlaceSearchForm } from "@/features/places/components/place-search-form";
import { parseDiscoveryQuery } from "@/features/discovery/discovery-model";

vi.mock("@/features/places/place-search-api", () => ({
  searchPlaces: vi.fn(async () => ({
    status: "ready",
    items: [{ title: "경복궁" }, { title: "경복궁" }, { title: "경복궁 돌담길" }],
  })),
}));

const place = {
  provider: "KAKAO_LOCAL" as const,
  providerPlaceId: "123",
  title: "새로운 정원",
  categoryLabel: "관광명소 > 정원",
  telephone: "02-123-4567",
  address: "서울 종로구",
  roadAddress: "서울 종로구 사직로 161",
  longitude: 126.977,
  latitude: 37.579,
  distanceMeters: null,
  placeUrl: "https://place.map.kakao.com/123",
  imageUrl: null,
  matchedPlaceId: null,
};

describe("external place results", () => {
  it("opens factual details without sending an external ID to the internal detail route", async () => {
    const user = userEvent.setup();
    render(
      <ul>
        <ExternalPlaceResult place={place} />
      </ul>,
    );
    await user.click(screen.getByRole("button", { name: /새로운 정원/ }));
    const dialog = screen.getByRole("dialog", { name: "새로운 정원" });
    expect(within(dialog).getByText("서울 종로구 사직로 161")).toBeVisible();
    expect(within(dialog).queryByText("02-123-4567")).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(/카카오맵에서 제공하는 장소 정보/),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("link", { name: "카카오맵에서 자세히 보기" }),
    ).toHaveAttribute("href", place.placeUrl);
    expect(
      within(dialog).getByText(/상세 설명과 사진은 아직 준비되지 않았어요/),
    ).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("opens existing details for matched stored places", () => {
    render(
      <ul>
        <ExternalPlaceResult
          place={{
            ...place,
            matchedPlaceId: "84549352-0c20-4e11-af50-2d4f278f41ef",
          }}
        />
      </ul>,
    );
    expect(screen.getByRole("link", { name: /새로운 정원/ })).toHaveAttribute(
      "href",
      "/places/84549352-0c20-4e11-af50-2d4f278f41ef?tab=introduction",
    );
  });
  it("submits searches without regional filtering", () => {
    render(
      <PlaceSearchForm
        query={parseDiscoveryQuery({
          region: "gyeonggi",
          reelRegion: "jeju",
          q: "경복궁",
        })}
      />,
    );
    const form = screen.getByRole("search") as HTMLFormElement;
    expect(new FormData(form).has("searchRegion")).toBe(false);
    expect(new FormData(form).has("region")).toBe(false);
    expect(screen.queryByRole("combobox", { name: "검색 지역" })).not.toBeInTheDocument();
    expect(new FormData(form).get("reelRegion")).toBe("jeju");
  });
  it("suggests related searches while typing", async () => {
    render(<PlaceSearchForm query={parseDiscoveryQuery({ reelRegion: "jeju" })} />);
    await userEvent.type(screen.getByRole("searchbox"), "경복");
    const list = await screen.findByRole("list", { name: "관련 검색어" });
    const links = within(list).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[1]).toHaveAttribute(
      "href",
      `/explore?${new URLSearchParams({ q: "경복궁 돌담길", reelRegion: "jeju" })}`,
    );
  });
});
