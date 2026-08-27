import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { metadata } from "@/app/layout";

describe("root metadata", () => {
  it("uses the Korean brand name in the browser title", () => {
    expect(metadata.title).toBe("해뜸");
  });
});

describe("RootLayout", () => {
  it("keeps the supplied route content inside the shared root shell", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { default: RootLayout } = await import("@/app/layout");
    const layout = RootLayout({
      children: createElement("p", undefined, "route content"),
      params: Promise.resolve({}),
    });
    render(layout);

    expect(screen.getByText("route content")).toBeVisible();
  });
});
