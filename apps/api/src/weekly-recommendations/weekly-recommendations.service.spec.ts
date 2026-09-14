import { jest } from "@jest/globals";
import { WeeklyRecommendationsService } from "./weekly-recommendations.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { WeeklyThumbnailService } from "./weekly-thumbnail.service.js";

const now = new Date("2026-09-14T00:00:00Z");
const snapshot = (i: number) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  title: `Place ${i}`,
  region: ["seoul", "busan", "jeju", "chungnam", "jeonbuk"][i % 5],
  district: null,
  address: "Address",
  longitude: 127,
  latitude: 36,
  primaryImageUrl: `https://media.example.com/weekly/${i}.webp`,
  imageCopyrightType: "Type1",
});
const rows = (
  count: number,
): {
  id: string;
  placeId: string;
  snapshot: ReturnType<typeof snapshot>;
  kind: string;
  status: string;
  position: number | null;
}[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `candidate-${i}`,
    placeId: snapshot(i).id,
    snapshot: snapshot(i),
    kind: i % 2 ? "culture" : "nature",
    status: "PASSED",
    position: i,
  }));
function fixture() {
  const edition = {
    id: "edition",
    week: now,
    status: "VERIFIED",
    verifiedAt: new Date(now.getTime() - 3_600_000),
  };
  const candidates = rows(25);
  const editionUpdate = jest
    .fn<(input: { data: Record<string, unknown> }) => Promise<unknown>>()
    .mockImplementation(({ data }) =>
      Promise.resolve(Object.assign(edition, data)),
    );
  const candidateUpdate = jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockImplementation((input) => {
      const { where, data } = input as {
        where: { id?: string; editionId_placeId?: { placeId: string } };
        data: Record<string, unknown>;
      };
      const row = candidates.find((p) =>
        where.id
          ? p.id === where.id
          : p.placeId === where.editionId_placeId?.placeId,
      );
      if (!row) throw new Error("MISSING_TEST_ROW");
      return Promise.resolve(Object.assign(row, data));
    });
  const candidateReset = jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue({ count: 25 });
  const candidateFind = jest
    .fn<(...args: unknown[]) => Promise<unknown[]>>()
    .mockImplementation((input) => {
      const { where } = input as {
        where: { edition?: unknown; status?: string | { in: string[] } };
      };
      if (where.edition) return Promise.resolve([]);
      const status = where.status;
      return Promise.resolve(
        candidates.filter(
          (p) =>
            !status ||
            (typeof status === "string"
              ? p.status === status
              : status.in.includes(p.status)),
        ),
      );
    });
  const visible = jest
    .fn<(...args: unknown[]) => Promise<unknown[]>>()
    .mockResolvedValue(candidates.map((p) => ({ id: p.placeId })));
  const candidateUpsert = jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue({});
  const tx = {
    $queryRaw: jest
      .fn<(...args: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValue([{ token: "lease" }]),
    weeklyRecommendationCandidate: {
      findMany: candidateFind,
      update: candidateUpdate,
      updateMany: candidateReset,
      upsert: candidateUpsert,
    },
    weeklyRecommendationEdition: { update: editionUpdate },
    place: { findMany: visible },
  };
  const prisma = {
    $queryRaw: jest
      .fn<(...args: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValue([{ token: "lease" }]),
    $transaction: jest
      .fn<(work: (client: typeof tx) => Promise<unknown>) => Promise<unknown>>()
      .mockImplementation((work) => work(tx)),
    weeklyRecommendationLease: {
      deleteMany: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({ count: 1 }),
      updateMany: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({ count: 1 }),
    },
    weeklyRecommendationEdition: {
      findUnique: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(edition),
      findFirst: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({ ...edition, candidates: candidates.slice(0, 20) }),
      upsert: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(edition),
      update: editionUpdate,
    },
    weeklyRecommendationCandidate: {
      findMany: candidateFind,
      update: candidateUpdate,
      upsert: candidateUpsert,
    },
    place: {
      findMany: visible,
      findUnique: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(null),
    },
  };
  const provider = {
    getPlaceCommonDetail: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockRejectedValue(new Error("offline")),
    getPlaceIntro: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getPlaceImages: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
  const thumbnails = {
    prepare: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    verify: jest.fn<(...args: unknown[]) => Promise<boolean>>(),
  };
  const sleep = jest
    .fn<(ms: number) => Promise<void>>()
    .mockResolvedValue(undefined);
  const service = new WeeklyRecommendationsService(
    prisma as unknown as PrismaService,
    thumbnails as unknown as WeeklyThumbnailService,
    sleep,
  );
  return {
    service,
    prisma,
    tx,
    edition,
    candidates,
    provider,
    thumbnails,
    sleep,
  };
}

function enableSuccessfulValidation(f: ReturnType<typeof fixture>) {
  f.prisma.place.findMany.mockResolvedValue([]);
  f.prisma.place.findUnique.mockImplementation((input) => {
    const {
      where: { id },
    } = input as { where: { id: string } };
    const row = f.candidates.find((p) => p.placeId === id)!;
    return Promise.resolve({
      ...row.snapshot,
      externalId: id,
      providerModifiedAt: now,
      detailSourceModifiedAt: now,
      detailSyncedAt: now,
      restDate: "연중무휴",
      useSeason: null,
      images: [],
      source: "TOUR_API",
      contentTypeId: 12,
      category1: row.kind === "culture" ? "HS" : "NA",
      isVisible: true,
      region: { slug: row.snapshot.region, isActive: true },
      district: null,
      address1: "Address",
      address2: null,
      longitude: { toNumber: () => 127 },
      latitude: { toNumber: () => 36 },
    });
  });
  f.provider.getPlaceCommonDetail.mockImplementation((id) =>
    Promise.resolve({ contentid: id }),
  );
  f.provider.getPlaceIntro.mockImplementation((id) =>
    Promise.resolve({ contentid: id, restdate: "연중무휴" }),
  );
  f.provider.getPlaceImages.mockResolvedValue([]);
  f.thumbnails.prepare.mockResolvedValue({
    url: "https://media.example.com/weekly/a.webp",
    copyrightType: "Type1",
  });
  f.thumbnails.verify.mockResolvedValue(true);
}

describe("WeeklyRecommendationsService", () => {
  it("serves individually checked draft cards and fills from prior weeks", async () => {
    const f = fixture();
    enableSuccessfulValidation(f);
    const place = await f.prisma.place.findUnique({
      where: { id: snapshot(0).id },
    });
    f.prisma.place.findMany.mockResolvedValue([place]);
    f.prisma.weeklyRecommendationCandidate.findMany.mockResolvedValue([
      {
        ...f.candidates[0],
        checkedAt: now,
        checks: {
          policyVersion: 2,
          source: "PASSED",
          fields: "PASSED",
          thumbnail: "PASSED",
          sourceModifiedAt: now.toISOString(),
        },
        edition: { week: new Date("2026-09-07T00:00:00Z"), status: "DRAFT" },
      },
    ]);
    expect(await f.service.current(now)).toEqual({
      week: "2026-09-07",
      items: [snapshot(0)],
    });
    expect(f.thumbnails.prepare).not.toHaveBeenCalled();
    expect(f.provider.getPlaceCommonDetail).not.toHaveBeenCalled();
  });
  it("prioritizes this week, deduplicates fallback cards and caps the response at twenty", async () => {
    const f = fixture();
    enableSuccessfulValidation(f);
    const places = await Promise.all(
      f.candidates.map((c) =>
        f.prisma.place.findUnique({ where: { id: c.placeId } }),
      ),
    );
    f.prisma.place.findMany.mockResolvedValue(places);
    const candidates = f.candidates.map((c, i) => ({
      ...c,
      checkedAt: now,
      checks: {
        policyVersion: 2,
        source: "PASSED",
        fields: "PASSED",
        thumbnail: "PASSED",
        sourceModifiedAt: now.toISOString(),
      },
      edition: { week: new Date(i < 2 ? "2026-09-14" : "2026-09-07") },
    }));
    f.prisma.weeklyRecommendationCandidate.findMany.mockResolvedValue([
      candidates[0],
      candidates[1],
      candidates[0],
      ...candidates.slice(2),
    ]);
    const result = await f.service.current(now);
    expect(result.week).toBe("2026-09-14");
    expect(result.items).toEqual(
      Array.from({ length: 20 }, (_, i) => snapshot(i)),
    );
  });
  it("keeps the first successful card readable when a later validation crashes", async () => {
    const f = fixture();
    enableSuccessfulValidation(f);
    f.candidates.splice(2);
    const place = await f.prisma.place.findUnique({
      where: { id: f.candidates[0].placeId },
    });
    f.prisma.place.findUnique
      .mockResolvedValueOnce(place)
      .mockRejectedValueOnce(new Error("offline"));
    await expect(f.service.validate(now, "2026-09-14")).rejects.toThrow(
      "offline",
    );
    expect(f.edition.status).toBe("FAILED");
    expect(f.candidates[0]).toMatchObject({
      status: "PASSED",
      checks: { policyVersion: 2, thumbnail: "PASSED" },
    });
  });
  it.each(["expired", "legacy", "changed", "hidden", "future"])(
    "rejects %s cards",
    async (reason) => {
      const f = fixture();
      enableSuccessfulValidation(f);
      const place = (await f.prisma.place.findUnique({
        where: { id: snapshot(0).id },
      })) as Record<string, unknown>;
      if (reason === "changed")
        place.providerModifiedAt = new Date(now.getTime() + 1);
      if (reason === "hidden") place.isVisible = false;
      f.prisma.place.findMany.mockResolvedValue([place]);
      f.prisma.weeklyRecommendationCandidate.findMany.mockResolvedValue([
        {
          ...f.candidates[0],
          checkedAt: new Date(
            now.getTime() - (reason === "expired" ? 8 * 86400000 : 0),
          ),
          checks: {
            policyVersion: reason === "legacy" ? 1 : 2,
            source: "PASSED",
            fields: "PASSED",
            thumbnail: "PASSED",
            sourceModifiedAt: now.toISOString(),
          },
          edition: {
            week: new Date(reason === "future" ? "2026-09-21" : "2026-09-14"),
          },
        },
      ]);
      expect(await f.service.current(now)).toEqual({ week: null, items: [] });
    },
  );
  it("publishes a single verified place without a diversity or reserve minimum", async () => {
    const f = fixture();
    f.candidates.splice(1);
    await f.service.publish(now);
    expect(f.edition.status).toBe("PUBLISHED");
    expect(f.tx.weeklyRecommendationCandidate.update).toHaveBeenCalledTimes(1);
  });
  it("assigns twenty positions and publishes inside the fenced transaction, then skips a repeated publish", async () => {
    const f = fixture();
    await f.service.publish(now);
    expect(f.tx.weeklyRecommendationCandidate.update).toHaveBeenCalledTimes(20);
    expect(f.tx.weeklyRecommendationEdition.update).toHaveBeenLastCalledWith({
      where: { id: "edition" },
      data: { status: "PUBLISHED", publishedAt: now, errorCode: null },
    });
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
    await f.service.publish(now);
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(f.provider.getPlaceCommonDetail).not.toHaveBeenCalled();
  });
  it("refuses publication if the lease is lost or verification is stale", async () => {
    const f = fixture();
    f.tx.$queryRaw.mockResolvedValue([]);
    await expect(f.service.publish(now)).rejects.toThrow("LEASE_LOST");
    expect(f.tx.weeklyRecommendationCandidate.findMany).not.toHaveBeenCalled();
    f.edition.verifiedAt = new Date(now.getTime() - 49 * 3_600_000);
    await f.service.publish(now);
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it("samples only synchronized places when most of the DB is awaiting enrichment", async () => {
    const f = fixture();
    enableSuccessfulValidation(f);
    f.edition.status = "DRAFT";
    const good = await Promise.all(
      f.candidates.map((c) =>
        f.prisma.place.findUnique({ where: { id: c.placeId } }),
      ),
    );
    const pending = Array.from({ length: 1000 }, (_, i) => ({
      ...(good[i % 25] as Record<string, unknown>),
      id: snapshot(i + 100).id,
      title: `Pending ${i}`,
      detailSourceModifiedAt: null,
    }));
    f.prisma.place.findMany.mockResolvedValue([...pending, ...good]);
    f.prisma.weeklyRecommendationCandidate.findMany.mockResolvedValue([]);
    await f.service.prepare(new Date("2026-09-12T00:00:00Z"));
    expect(f.thumbnails.prepare).toHaveBeenCalledTimes(25);
    expect(f.tx.weeklyRecommendationCandidate.upsert).toHaveBeenCalledTimes(25);
    expect(f.edition.status).not.toBe("FAILED");
  });

  it("rejects unsynchronized detail without contacting TourAPI", async () => {
    const f = fixture();
    f.edition.status = "DRAFT";
    f.prisma.weeklyRecommendationCandidate.findMany.mockResolvedValue([]);
    f.prisma.place.findMany.mockResolvedValue([
      {
        ...snapshot(0),
        externalId: "source",
        source: "TOUR_API",
        contentTypeId: 12,
        category1: "NA",
        isVisible: true,
        region: { slug: "seoul", isActive: true },
        district: null,
        address1: "Address",
        address2: null,
        longitude: { toNumber: () => 127 },
        latitude: { toNumber: () => 36 },
      },
    ]);
    await f.service.prepare(new Date("2026-09-12T00:00:00Z"));
    expect(f.provider.getPlaceCommonDetail).not.toHaveBeenCalled();
    expect(f.thumbnails.prepare).not.toHaveBeenCalled();
    expect(
      f.prisma.weeklyRecommendationCandidate.upsert,
    ).not.toHaveBeenCalled();
    expect(f.edition.status).toBe("FAILED");
    expect(
      f.tx.weeklyRecommendationCandidate.updateMany,
    ).not.toHaveBeenCalled();
  });
  it("rejects missing places during validation and leaves the edition failed", async () => {
    const f = fixture();
    f.edition.status = "DRAFT";
    f.prisma.place.findMany.mockResolvedValue([]);
    f.candidates.splice(1);
    await f.service.validate(new Date("2026-09-13T00:00:00Z"));
    expect(f.prisma.weeklyRecommendationCandidate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REJECTED",
          reason: "PLACE_MISSING",
        }) as unknown,
      }),
    );
    expect(f.edition.status).toBe("FAILED");
    expect(
      f.tx.weeklyRecommendationCandidate.updateMany,
    ).not.toHaveBeenCalled();
  });
  it("validates saved details even when TourAPI is unavailable", async () => {
    const f = fixture();
    enableSuccessfulValidation(f);
    f.provider.getPlaceCommonDetail.mockRejectedValue(new Error("offline"));
    await f.service.validate(new Date("2026-09-13T00:00:00Z"));
    expect(f.provider.getPlaceCommonDetail).not.toHaveBeenCalled();
    expect(f.edition.status).toBe("VERIFIED");
  });
  it("retries thumbnail failures using stored image data", async () => {
    const f = fixture();
    enableSuccessfulValidation(f);
    f.thumbnails.prepare.mockRejectedValueOnce(new Error("image unavailable"));
    await f.service.validate(new Date("2026-09-13T00:00:00Z"));
    expect(f.sleep).toHaveBeenCalledWith(1000);
    expect(f.thumbnails.prepare).toHaveBeenCalledTimes(26);
    expect(f.edition.status).toBe("VERIFIED");
  });
  it("bootstraps the current week through validation before first publication", async () => {
    const f = fixture();
    enableSuccessfulValidation(f);
    f.prisma.weeklyRecommendationEdition.findFirst.mockResolvedValue(null);
    f.prisma.place.findMany.mockImplementation((input) => {
      const { where } = input as { where: { source?: string } };
      return Promise.resolve(
        where.source ? [] : f.candidates.map((p) => ({ id: p.placeId })),
      );
    });
    await f.service.bootstrap(new Date("2026-09-12T00:00:00Z"));
    expect(f.prisma.weeklyRecommendationEdition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { week: new Date("2026-09-07T00:00:00Z") },
      }),
    );
    expect(f.thumbnails.prepare).toHaveBeenCalledTimes(25);
    expect(f.edition.status).toBe("PUBLISHED");
  });
  it("does not replace an existing published edition during bootstrap", async () => {
    const f = fixture();
    await f.service.bootstrap();
    expect(f.prisma.weeklyRecommendationEdition.upsert).not.toHaveBeenCalled();
    expect(f.provider.getPlaceCommonDetail).not.toHaveBeenCalled();
  });
  it("revalidates twenty-five candidates before marking the edition verified", async () => {
    const f = fixture();
    enableSuccessfulValidation(f);
    await f.service.validate(new Date("2026-09-13T00:00:00Z"));
    expect(f.edition.status).toBe("VERIFIED");
    expect(f.thumbnails.prepare).toHaveBeenCalledTimes(25);
    expect(f.candidates.every((p) => p.status === "PASSED")).toBe(true);
    expect(
      f.tx.weeklyRecommendationEdition.update.mock.calls[0][0].data,
    ).toMatchObject({ status: "DRAFT", verifiedAt: null });
    expect(
      f.tx.weeklyRecommendationEdition.update.mock.calls.at(-1)?.[0].data,
    ).toMatchObject({ status: "VERIFIED" });
  });
  it("clears prior verification before a revalidation crash so publication remains blocked", async () => {
    const f = fixture();
    enableSuccessfulValidation(f);
    f.prisma.place.findUnique.mockRejectedValue(
      new Error("database unavailable"),
    );
    await expect(
      f.service.validate(new Date("2026-09-13T00:00:00Z")),
    ).rejects.toThrow("database unavailable");
    expect(f.edition.status).toBe("FAILED");
    expect(f.edition.verifiedAt).toBeNull();
    await f.service.publish(now);
    expect(
      f.tx.weeklyRecommendationCandidate.updateMany,
    ).not.toHaveBeenCalled();
  });
  it("does not persist a provider result after the lease expires during its check", async () => {
    const f = fixture();
    enableSuccessfulValidation(f);
    f.thumbnails.prepare.mockImplementation(() => {
      f.tx.$queryRaw.mockResolvedValue([]);
      return Promise.resolve({
        url: "https://media.example.com/weekly/a.webp",
        copyrightType: "Type1",
      });
    });
    await expect(
      f.service.validate(new Date("2026-09-13T00:00:00Z")),
    ).rejects.toThrow("LEASE_LOST");
    expect(f.thumbnails.prepare).toHaveBeenCalledTimes(1);
    expect(f.tx.weeklyRecommendationCandidate.update).not.toHaveBeenCalled();
    expect(f.edition.status).toBe("DRAFT");
    expect(f.prisma.weeklyRecommendationLease.deleteMany).toHaveBeenCalledTimes(
      1,
    );
  });
  it("daily repair rechecks and replenishes the current week even without a publication", async () => {
    const f = fixture();
    const prepare = jest.spyOn(f.service, "prepare").mockResolvedValue();
    const validate = jest.spyOn(f.service, "validate").mockResolvedValue();
    const publish = jest.spyOn(f.service, "publish").mockResolvedValue();
    await f.service.repair(now);
    expect(prepare).toHaveBeenCalledWith(now, "2026-09-14");
    expect(validate).toHaveBeenCalledWith(now, "2026-09-14");
    expect(publish).toHaveBeenCalledWith(now);
  });
});
