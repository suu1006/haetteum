import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WeeklyPlaceListItem } from "@/components/domain/place/weekly-place-list-item";
import { WeeklyPlacesSection } from "@/features/discovery/components/weekly-places-section";
const items = Array.from({ length: 20 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  title: `장소 ${i}`, region: "chungnam", address: "충남", district: null,
  latitude: null, longitude: null, primaryImageUrl: `https://media.example.com/weekly/${i}.webp`, imageCopyrightType: "Type1",
}));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("loads prepared thumbnails only when their cards approach the viewport", () => {
  vi.stubEnv("NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL", "https://media.example.com/weekly");
  const observers: { callback: IntersectionObserverCallback; node?: Element }[] = [];
  vi.stubGlobal("IntersectionObserver", class {
    entry: typeof observers[number];
    constructor(callback: IntersectionObserverCallback) { this.entry = { callback }; observers.push(this.entry); }
    observe(node: Element) { this.entry.node = node; }
    disconnect() {}
    unobserve() {}
  });
  render(<WeeklyPlacesSection results={{ status: "ready", items }} />);
  expect(screen.getAllByRole("article")).toHaveLength(20);
  expect(document.querySelectorAll('img[src*="media.example.com"]')).toHaveLength(0);
  act(() => {
    const observer = observers.find(entry => entry.node === screen.getAllByRole("article")[0])!;
    observer.callback([{ target: observer.node, isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
  const image = document.querySelector('img[src*="media.example.com"]');
  expect(image).toHaveAttribute("src", items[0].primaryImageUrl);
  expect(document.querySelectorAll('img[src*="media.example.com"]')).toHaveLength(1);
  expect(screen.getByText(/한국관광공사/)).toBeInTheDocument();
});
it.each(["https://evil.example.com/weekly/a.webp", "https://media.example.com/weekly-evil/a.webp", "https://media.example.com/weekly/a.webp?redirect=1", "https://tong.visitkorea.or.kr/a.jpg"])("does not load a non-prepared URL: %s", (url) => {
  vi.stubEnv("NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL", "https://media.example.com/weekly");
  render(<WeeklyPlaceListItem priority place={{ ...items[0], primaryImageUrl: url }} />);
  expect(screen.getByRole("img")).toHaveAttribute("data-image-state", "placeholder");
});
