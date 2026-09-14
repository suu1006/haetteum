import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WeeklyPlacesSection } from "@/features/discovery/components/weekly-places-section";
const items = Array.from({ length: 20 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  title: `장소 ${i}`, region: "chungnam", address: "충남", district: null,
  latitude: null, longitude: null, primaryImageUrl: `https://media.example.com/weekly/${i}.webp`, imageCopyrightType: "Type1",
}));
afterEach(() => vi.unstubAllEnvs());
it("renders twenty square cards with deferred prepared thumbnails below the hero", () => {
  vi.stubEnv("NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL", "https://media.example.com/weekly");
  render(<WeeklyPlacesSection results={{ status: "ready", items }} />);
  const images = screen.getAllByRole("img");
  expect(screen.getAllByRole("article")).toHaveLength(20);
  images.forEach((image, index) => {
    expect(image).toHaveAttribute("src", items[index].primaryImageUrl);
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("fetchpriority", "auto");
    expect(image.parentElement).toHaveClass("aspect-square");
  });
  expect(screen.getByText(/한국관광공사/)).toBeInTheDocument();
});
it.each(["https://evil.example.com/weekly/a.webp", "https://media.example.com/weekly-evil/a.webp", "https://media.example.com/weekly/a.webp?redirect=1", "https://tong.visitkorea.or.kr/a.jpg"])("does not load a non-prepared URL: %s", (url) => {
  vi.stubEnv("NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL", "https://media.example.com/weekly");
  render(<WeeklyPlacesSection results={{ status: "ready", items: [{ ...items[0], primaryImageUrl: url }] }} />);
  expect(screen.getByRole("img")).toHaveAttribute("data-image-state", "placeholder");
});
