/* eslint-disable @typescript-eslint/require-await -- deterministic fake boundaries preserve async interfaces */
import type { FestivalRepository } from "./festival.repository.js";
import { FestivalSyncService } from "./festival-sync.service.js";
import { TourApiError } from "./tour-api.client.js";
import { TourApiPolicyError } from "./tour-api-policy.js";
import type {
  FestivalApiPort,
  TourApiFestival,
  TourApiFestivalIntro,
  TourApiPage,
  TourApiPlaceDetail,
  TourApiPlaceImage,
  TourApiPort,
} from "./tour-api.types.js";

const RANGE = {
  eventStartDate: "20260101",
  eventEndDate: "20271231",
} as const;

function festival(externalId: string): TourApiFestival {
  return {
    contentid: externalId,
    contenttypeid: "15",
    title: `축제 ${externalId}`,
    eventstartdate: "20260801",
    eventenddate: "20260831",
    modifiedtime: "20260824000000",
    lclsSystm1: "EV",
    lclsSystm2: "EV01",
    lclsSystm3: "EV010100",
  };
}

function page(
  items: readonly TourApiFestival[],
  pageNo = 1,
  numOfRows = 100,
  totalCount = items.length,
): TourApiPage<TourApiFestival> {
  return { items, pageNo, numOfRows, totalCount };
}

class FakeFestivalApi implements FestivalApiPort {
  readonly pages = new Map<number, TourApiPage<TourApiFestival> | Error>();
  readonly calls: Array<Record<string, unknown>> = [];

  async getFestivalPage(input: {
    eventStartDate: string;
    eventEndDate: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiFestival>> {
    this.calls.push(input);
    const result = this.pages.get(input.pageNo) ?? page([], input.pageNo);
    if (result instanceof Error) throw result;
    return result;
  }
}

class FakeFestivalRepository {
  readonly storedIds = new Set<string>();
  readonly pages: string[][] = [];
  readonly failures: Array<{ summary: string; counters: unknown }> = [];
  readonly deactivateCalls: Array<{
    rangeStart: Date;
    rangeEnd: Date;
    seenExternalIds: readonly string[];
  }> = [];
  completeCalls = 0;
  upsertError: Error | undefined;
  deactivatedCount = 0;
  readonly pendingDetails: Array<{
    id: string;
    externalId: string;
    providerModifiedAt: Date;
  }> = [];
  readonly savedDetails: Array<Record<string, unknown>> = [];
  saveDetailError: Error | undefined;

  async createSyncRun(rangeStart: Date) {
    expect(rangeStart).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    return { id: "run-1" };
  }

  async upsertPage(items: readonly { externalId: string }[]) {
    if (this.upsertError) throw this.upsertError;
    let insertedCount = 0;
    let updatedCount = 0;
    this.pages.push(items.map((item) => item.externalId));
    for (const item of items) {
      if (this.storedIds.has(item.externalId)) updatedCount += 1;
      else {
        this.storedIds.add(item.externalId);
        insertedCount += 1;
      }
    }
    return { insertedCount, updatedCount };
  }

  async deactivateMissing(input: {
    rangeStart: Date;
    rangeEnd: Date;
    seenExternalIds: ReadonlySet<string>;
    lastSyncedAt: Date;
  }) {
    this.deactivateCalls.push({
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      seenExternalIds: [...input.seenExternalIds],
    });
    return this.deactivatedCount;
  }

  async findPendingDetails() {
    return this.pendingDetails;
  }

  async saveDetailSnapshot(input: Record<string, unknown>) {
    if (this.saveDetailError) throw this.saveDetailError;
    this.savedDetails.push(input);
  }

  async completeSyncRun(
    runId: string,
    counters: {
      fetchedCount: number;
      insertedCount: number;
      updatedCount: number;
      deactivatedCount: number;
      failedCount: number;
    },
  ) {
    this.completeCalls += 1;
    return {
      runId,
      status: "SUCCEEDED" as const,
      ...counters,
    };
  }

  async failSyncRun(_runId: string, counters: unknown, summary: string) {
    this.failures.push({ counters, summary });
  }
}

class FakeTourApi {
  readonly calls: string[] = [];
  common: TourApiPlaceDetail = {
    contentid: "festival-1",
    contenttypeid: "15",
    overview: "축제 소개",
  };
  intro: TourApiFestivalIntro = {
    contentid: "festival-1",
    contenttypeid: "15",
    eventplace: "축제장",
  };
  images: readonly TourApiPlaceImage[] = [
    {
      contentid: "festival-1",
      serialnum: "1",
      originimgurl: "https://tong.visitkorea.or.kr/festival.jpg",
    },
  ];
  error: Error | undefined;

  async getPlaceCommonDetail(contentId: string) {
    this.calls.push(`common:${contentId}`);
    if (this.error) throw this.error;
    return this.common;
  }

  async getFestivalIntro(contentId: string) {
    this.calls.push(`intro:${contentId}`);
    if (this.error) throw this.error;
    return this.intro;
  }

  async getPlaceImages(contentId: string) {
    this.calls.push(`images:${contentId}`);
    if (this.error) throw this.error;
    return this.images;
  }
}

function setup() {
  const provider = new FakeFestivalApi();
  const details = new FakeTourApi();
  const repository = new FakeFestivalRepository();
  const service = new FestivalSyncService(
    provider,
    details as unknown as TourApiPort,
    repository as unknown as FestivalRepository,
  );
  return { details, provider, repository, service };
}

describe("FestivalSyncService", () => {
  it("traverses every page, maps items, and completes exact counters", async () => {
    const { provider, repository, service } = setup();
    provider.pages.set(1, page([festival("festival-1")], 1, 1, 2));
    provider.pages.set(2, page([festival("festival-2")], 2, 1, 2));

    await expect(service.fullSync(RANGE)).resolves.toEqual({
      runId: "run-1",
      status: "SUCCEEDED",
      fetchedCount: 2,
      insertedCount: 2,
      updatedCount: 0,
      deactivatedCount: 0,
      failedCount: 0,
    });
    expect(provider.calls).toEqual([
      { ...RANGE, pageNo: 1 },
      { ...RANGE, pageNo: 2 },
    ]);
    expect(repository.pages).toEqual([["festival-1"], ["festival-2"]]);
    expect(repository.completeCalls).toBe(1);
    expect(repository.failures).toHaveLength(0);
  });

  it("enriches only repository-selected festival detail versions after deactivation", async () => {
    const { details, provider, repository, service } = setup();
    const providerModifiedAt = new Date("2026-08-23T15:00:00.000Z");
    provider.pages.set(1, page([festival("festival-1")]));
    repository.pendingDetails.push({
      id: "festival-row-1",
      externalId: "festival-1",
      providerModifiedAt,
    });

    await expect(service.fullSync(RANGE)).resolves.toMatchObject({
      failedCount: 0,
    });

    expect(details.calls).toEqual([
      "common:festival-1",
      "intro:festival-1",
      "images:festival-1",
    ]);
    expect(repository.savedDetails).toHaveLength(1);
    expect(repository.savedDetails[0]).toMatchObject({
      id: "festival-row-1",
      providerModifiedAt,
      snapshot: {
        common: details.common,
        intro: details.intro,
        images: details.images,
      },
    });
    expect(repository.savedDetails[0]?.detailSyncedAt).toBeInstanceOf(Date);
    expect(repository.deactivateCalls).toHaveLength(1);
  });

  it("counts an individual detail failure and leaves its completion marker untouched for retry", async () => {
    const { details, provider, repository, service } = setup();
    provider.pages.set(1, page([festival("festival-1")]));
    repository.pendingDetails.push({
      id: "festival-row-1",
      externalId: "festival-1",
      providerModifiedAt: new Date("2026-08-23T15:00:00.000Z"),
    });
    details.error = new TourApiError("detailCommon2", "EMPTY_RESPONSE");

    await expect(service.fullSync(RANGE)).resolves.toMatchObject({
      status: "SUCCEEDED",
      failedCount: 1,
    });
    expect(repository.savedDetails).toHaveLength(0);
    expect(repository.failures).toHaveLength(0);
  });

  it("propagates a shared TourAPI policy failure immediately", async () => {
    const { details, provider, repository, service } = setup();
    provider.pages.set(1, page([festival("festival-1")]));
    repository.pendingDetails.push(
      {
        id: "festival-row-1",
        externalId: "festival-1",
        providerModifiedAt: new Date("2026-08-23T15:00:00.000Z"),
      },
      {
        id: "festival-row-2",
        externalId: "festival-2",
        providerModifiedAt: new Date("2026-08-23T15:00:00.000Z"),
      },
    );
    details.error = new TourApiPolicyError("TOUR_API_DAILY_LIMIT");

    await expect(service.fullSync(RANGE)).rejects.toBe(details.error);
    expect(details.calls).toEqual(["common:festival-1"]);
    expect(repository.failures).toHaveLength(1);
  });

  it("stops detail enrichment immediately when the provider quota is exhausted", async () => {
    const { details, provider, repository, service } = setup();
    provider.pages.set(1, page([festival("festival-1")]));
    repository.pendingDetails.push(
      {
        id: "festival-row-1",
        externalId: "festival-1",
        providerModifiedAt: new Date("2026-08-23T15:00:00.000Z"),
      },
      {
        id: "festival-row-2",
        externalId: "festival-2",
        providerModifiedAt: new Date("2026-08-23T15:00:00.000Z"),
      },
    );
    details.error = new TourApiError("detailCommon2", "22", 200);

    await expect(service.fullSync(RANGE)).rejects.toThrow(
      "Festival synchronization failed (22)",
    );
    expect(details.calls).toEqual(["common:festival-1"]);
  });

  it("counts mismatched detail identities without storing a mixed snapshot", async () => {
    const { details, provider, repository, service } = setup();
    provider.pages.set(1, page([festival("festival-1")]));
    repository.pendingDetails.push({
      id: "festival-row-1",
      externalId: "festival-1",
      providerModifiedAt: new Date("2026-08-23T15:00:00.000Z"),
    });
    details.intro = { ...details.intro, contentid: "other-festival" };

    await expect(service.fullSync(RANGE)).resolves.toMatchObject({
      failedCount: 1,
    });
    expect(repository.savedDetails).toHaveLength(0);
  });

  it.each([
    {
      label: "an early empty page",
      pages: [page([], 1, 100, 1)],
    },
    {
      label: "a changing totalCount",
      pages: [
        page([festival("festival-1")], 1, 1, 2),
        page([festival("festival-2")], 2, 1, 3),
      ],
    },
    {
      label: "an accumulated item overflow",
      pages: [page([festival("festival-1"), festival("festival-2")], 1, 2, 1)],
    },
  ])("fails safely for $label", async ({ pages }) => {
    const { provider, repository, service } = setup();
    pages.forEach((result, index) => provider.pages.set(index + 1, result));

    await expect(service.fullSync(RANGE)).rejects.toThrow(
      "Festival synchronization failed: TourAPI returned invalid pagination metadata",
    );
    expect(repository.completeCalls).toBe(0);
    expect(repository.failures).toHaveLength(1);
  });

  it("hides festivals TourAPI no longer returns in the synced range", async () => {
    const { provider, repository, service } = setup();
    repository.deactivatedCount = 1;
    provider.pages.set(1, page([festival("festival-1")]));

    await expect(service.fullSync(RANGE)).resolves.toMatchObject({
      fetchedCount: 1,
      deactivatedCount: 1,
    });
    expect(repository.deactivateCalls).toEqual([
      {
        rangeStart: new Date("2026-01-01T00:00:00.000Z"),
        rangeEnd: new Date("2027-12-31T00:00:00.000Z"),
        seenExternalIds: ["festival-1"],
      },
    ]);
  });

  it("never hides festivals when the sync run fails", async () => {
    const { provider, repository, service } = setup();
    provider.pages.set(1, page([], 1, 100, 0));

    await expect(service.fullSync(RANGE)).rejects.toThrow(
      "Festival synchronization failed",
    );
    expect(repository.deactivateCalls).toHaveLength(0);
  });

  it("rejects a zero-result full sync", async () => {
    const { provider, repository, service } = setup();
    provider.pages.set(1, page([], 1, 100, 0));

    await expect(service.fullSync(RANGE)).rejects.toThrow(
      "Festival synchronization failed: TourAPI returned zero festivals",
    );
    expect(repository.failures).toHaveLength(1);
  });

  it("records sanitized provider, mapper, and repository failures", async () => {
    const providerFailure = setup();
    providerFailure.provider.pages.set(
      1,
      new TourApiError("searchFestival2", "22", 200),
    );
    await expect(providerFailure.service.fullSync(RANGE)).rejects.toThrow(
      "Festival synchronization failed (22)",
    );
    expect(providerFailure.repository.failures[0]?.summary).toBe(
      "Festival synchronization failed (22)",
    );

    const mapperFailure = setup();
    mapperFailure.provider.pages.set(
      1,
      page([{ ...festival("invalid"), contenttypeid: "12" }]),
    );
    await expect(mapperFailure.service.fullSync(RANGE)).rejects.toThrow(
      "Invalid TourAPI festival content type",
    );

    const secret = "SERVICE_KEY=do-not-leak";
    const repositoryFailure = setup();
    repositoryFailure.repository.upsertError = new Error(secret);
    repositoryFailure.provider.pages.set(1, page([festival("festival-1")]));
    const error = await repositoryFailure.service
      .fullSync(RANGE)
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toBe("Error: Festival synchronization failed");
    expect(JSON.stringify(repositoryFailure.repository.failures)).not.toContain(
      secret,
    );
  });
});
