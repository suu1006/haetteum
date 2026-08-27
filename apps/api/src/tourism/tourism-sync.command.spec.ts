import { parseCommandArguments } from "./tourism-sync.command.js";

describe("tourism sync command arguments", () => {
  it("accepts the ranked detail enrichment mode without a content ID", () => {
    expect(parseCommandArguments(["--mode=enrich-ranked"])).toEqual({
      mode: "enrich-ranked",
    });
  });

  it("rejects a content ID with ranked enrichment", () => {
    expect(() =>
      parseCommandArguments(["--mode=enrich-ranked", "--content-id=2704412"]),
    ).toThrow("Invalid tourism sync arguments");
  });
});
