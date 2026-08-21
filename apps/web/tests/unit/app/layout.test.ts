import { describe, expect, it } from "vitest";

import { metadata } from "@/app/layout";

describe("root metadata", () => {
  it("uses the Korean brand name in the browser title", () => {
    expect(metadata.title).toBe("해뜸");
  });
});
