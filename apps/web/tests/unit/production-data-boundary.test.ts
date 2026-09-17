import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("keeps test fixtures and mock datasets out of production source imports", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
  }
  const sources = walk("src").filter(path => /\.tsx?$/.test(path) && !/\.(test|stories)\./.test(path));
  const violations = sources.filter(path => /\.mock\.tsx?$/.test(path) || /(?:from\s*|import\s*\()(["'])[^"']*(?:\.mock|tests\/fixtures)[^"']*\1/.test(readFileSync(path, "utf8")));
  expect(violations).toEqual([]);
});
