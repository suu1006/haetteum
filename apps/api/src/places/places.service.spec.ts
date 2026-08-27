import { jest } from "@jest/globals";

import { Prisma } from "../generated/prisma/client.js";
import { PlacesService } from "./places.service.js";

type PlaceListRow = {
  id: string;
  title: string;
  address1: string | null;
  address2: string | null;
  longitude: Prisma.Decimal | null;
  latitude: Prisma.Decimal | null;
  primaryImageUrl: string | null;
  imageCopyrightType: string | null;
  district: { name: string } | null;
};

describe("PlacesService", () => {
  it("lists visible places in an active region with the requested search and stable ordering", async () => {
    const rows: PlaceListRow[] = [
      {
        id: "84549352-0c20-4e11-af50-2d4f278f41ef",
        title: "성산일출봉",
        address1: "  제주특별자치도 서귀포시 성산읍  ",
        address2: "  성산리 1-1  ",
        longitude: new Prisma.Decimal("126.940506"),
        latitude: new Prisma.Decimal("33.458056"),
        primaryImageUrl: "https://example.test/seongsan.jpg",
        imageCopyrightType: "Type1",
        district: { name: "서귀포시" },
      },
      {
        id: "6d1f4900-e145-4b79-aa27-3925f2c730ac",
        title: "성산항",
        address1: "   ",
        address2: null,
        longitude: null,
        latitude: null,
        primaryImageUrl: null,
        imageCopyrightType: null,
        district: null,
      },
    ];
    const findMany = jest
      .fn<() => Promise<PlaceListRow[]>>()
      .mockResolvedValue(rows);
    const count = jest.fn<() => Promise<number>>().mockResolvedValue(2);
    const transaction = jest.fn(async (queries: readonly Promise<unknown>[]) =>
      Promise.all(queries),
    );
    const prisma = {
      $transaction: transaction,
      place: { findMany, count },
    };
    const service = new PlacesService(prisma as never);

    await expect(
      service.list({ region: "jeju", page: 2, pageSize: 10, q: "성산" }),
    ).resolves.toEqual({
      items: [
        {
          id: "84549352-0c20-4e11-af50-2d4f278f41ef",
          title: "성산일출봉",
          region: "jeju",
          district: "서귀포시",
          address: "제주특별자치도 서귀포시 성산읍 성산리 1-1",
          longitude: 126.940506,
          latitude: 33.458056,
          primaryImageUrl: "https://example.test/seongsan.jpg",
          imageCopyrightType: "Type1",
        },
        {
          id: "6d1f4900-e145-4b79-aa27-3925f2c730ac",
          title: "성산항",
          region: "jeju",
          district: null,
          address: null,
          longitude: null,
          latitude: null,
          primaryImageUrl: null,
          imageCopyrightType: null,
        },
      ],
      page: 2,
      pageSize: 10,
      totalCount: 2,
    });

    const where = {
      isVisible: true,
      region: { is: { slug: "jeju", isActive: true } },
      OR: [
        { title: { contains: "성산", mode: "insensitive" } },
        { address1: { contains: "성산", mode: "insensitive" } },
        { address2: { contains: "성산", mode: "insensitive" } },
      ],
    };
    expect(findMany).toHaveBeenCalledWith({
      where,
      skip: 10,
      take: 10,
      orderBy: [{ title: "asc" }, { id: "asc" }],
      include: { district: { select: { name: true } } },
    });
    expect(count).toHaveBeenCalledWith({ where });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("does not create a search filter for an empty query", async () => {
    const findMany = jest
      .fn<() => Promise<PlaceListRow[]>>()
      .mockResolvedValue([]);
    const count = jest.fn<() => Promise<number>>().mockResolvedValue(0);
    const transaction = jest.fn(async (queries: readonly Promise<unknown>[]) =>
      Promise.all(queries),
    );
    const service = new PlacesService({
      $transaction: transaction,
      place: { findMany, count },
    } as never);

    await expect(
      service.list({ region: "busan", page: 1, pageSize: 20, q: "" }),
    ).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isVisible: true,
          region: { is: { slug: "busan", isActive: true } },
        },
        skip: 0,
        take: 20,
      }),
    );
  });

  it("returns one visible place detail from PostgreSQL without provider calls", async () => {
    const id = "24684077-a907-45c3-85bf-b509dab12377";
    const findFirst = jest.fn<() => Promise<any>>().mockResolvedValue({
      id,
      title: "에버랜드",
      category1: "VE",
      category2: null,
      category3: null,
      address1: " 경기 용인시 ",
      address2: null,
      longitude: new Prisma.Decimal("127.2025"),
      latitude: new Prisma.Decimal("37.2939"),
      telephone: null,
      homepage: null,
      overview: "테마파크",
      primaryImageUrl: null,
      primaryThumbnailUrl: null,
      imageCopyrightType: null,
      infoCenter: null,
      restDate: null,
      useSeason: null,
      useTime: "09:00~18:00",
      parking: "주차 가능",
      experienceAgeRange: null,
      experienceGuide: null,
      babyCarriage: null,
      creditCard: null,
      pet: null,
      detailSyncedAt: new Date("2026-08-26T00:00:00.000Z"),
      region: { slug: "gyeonggi" },
      district: { name: "용인시" },
      images: [
        {
          name: "에버랜드 전경",
          originalUrl: "https://tong.visitkorea.or.kr/image.jpg",
          thumbnailUrl: null,
          copyrightType: "Type1",
        },
      ],
      detailInfos: [],
    });
    const service = new PlacesService(
      { place: { findFirst } } as never,
      { isConfigured: () => false } as never,
    );

    await expect(service.detail(id)).resolves.toMatchObject({
      id,
      title: "에버랜드",
      region: "gyeonggi",
      address: "경기 용인시",
      images: [{ alt: "에버랜드 전경", copyrightType: "Type1" }],
      introduction: { useTime: "09:00~18:00", parking: "주차 가능" },
    });
  });

  it("isolates an unconfigured Kakao provider from the nearby response", async () => {
    const findFirst = jest.fn<() => Promise<any>>().mockResolvedValue({
      id: "24684077-a907-45c3-85bf-b509dab12377",
      longitude: new Prisma.Decimal("127.2025"),
      latitude: new Prisma.Decimal("37.2939"),
    });
    const service = new PlacesService(
      { place: { findFirst } } as never,
      { isConfigured: () => false } as never,
    );

    await expect(
      service.nearby("24684077-a907-45c3-85bf-b509dab12377", {
        category: "restaurant",
        limit: 10,
      }),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider_not_configured",
    });
  });
});
