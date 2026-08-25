import { act, render, screen } from "@testing-library/react";
import { use } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { metadata } from "@/app/page";

afterEach(() => {
  vi.doUnmock("@/features/discovery/discovery-content");
  vi.resetModules();
});

describe("main page", () => {
  it("uses page metadata for the discovery surface", () => {
    expect(metadata).toMatchObject({
      title: "여행 탐색 | 해뜸",
    });
  });

  it("forwards search params through the route shell", async () => {
    vi.resetModules();
    vi.doMock("@/features/discovery/discovery-content", () => ({
      DiscoveryContent({
        searchParams,
      }: {
        searchParams: Promise<Record<string, string>>;
      }) {
        const params = use(searchParams);
        return (
          <output aria-label="forwarded search params">
            {params.q}|{params.region}|{params.tab}
          </output>
        );
      },
    }));
    const { default: Home } = await import("@/app/page");

    await act(async () => {
      render(
        <Home
          searchParams={Promise.resolve({
            q: "성산",
            region: "jeju",
            tab: "places",
          })}
        />,
      );
    });

    expect(
      await screen.findByRole("status", {
        name: "forwarded search params",
      }),
    ).toHaveTextContent("성산|jeju|places");
  });
});
