import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { jest } from "@jest/globals";

import { TourApiClient, TourApiError } from "./tour-api.client.js";
import {
  FESTIVAL_API_PORT,
  TOUR_API_FETCH,
  TOUR_API_PORT,
  TOUR_API_SLEEP,
} from "./tourism.constants.js";

const encodedServiceKey = "portal%2Bservice%2Fkey%3D";

const placeItem = {
  contentid: "2704412",
  contenttypeid: "12",
  title: "아침미소목장",
  addr1: "제주특별자치도 제주시 첨단동길 160-20",
  addr2: "",
  zipcode: "63312",
  mapx: "126.5851000000",
  mapy: "33.4541000000",
  mlevel: "6",
  tel: "064-727-2545",
  firstimage: "https://example.test/original.jpg",
  firstimage2: "https://example.test/thumb.jpg",
  cpyrhtDivCd: "Type1",
  createdtime: "20190717123456",
  modifiedtime: "20260720123456",
  lDongRegnCd: "50",
  lDongSignguCd: "110",
  lclsSystm1: "VE",
  lclsSystm2: "VE03",
  lclsSystm3: "VE030500",
};

const pageResponse = {
  response: {
    header: { resultCode: "0000", resultMsg: "OK" },
    body: {
      items: { item: [placeItem] },
      pageNo: 1,
      numOfRows: 100,
      totalCount: 1,
    },
  },
};

const districtItem = {
  lDongRegnCd: "50",
  lDongRegnNm: "제주특별자치도",
  lDongSignguCd: "110",
  lDongSignguNm: "제주시",
};

const changedPlaceItem = {
  ...placeItem,
  showflag: "1",
  oldContentid: "2704000",
};

const detailItem = {
  contentid: placeItem.contentid,
  contenttypeid: placeItem.contenttypeid,
  title: placeItem.title,
  overview: "초원의 아침을 만나는 목장입니다.",
  homepage: '<a href="https://example.test">홈페이지</a>',
};

const festivalItem = {
  contentid: "141268",
  contenttypeid: "15",
  title: "서천 홍원항 자연산 전어 꽃게 축제",
  eventstartdate: "20260822",
  eventenddate: "20260906",
  addr1: "충청남도 서천군 홍원길 88",
  modifiedtime: "20260824173655",
  lDongRegnCd: "44",
  lDongSignguCd: "770",
  lclsSystm1: "EV",
  lclsSystm2: "EV01",
  lclsSystm3: "EV010300",
};

type FetchMock = jest.Mock<
  (input: URL, init?: RequestInit) => Promise<Response>
>;

type SleepMock = jest.Mock<(milliseconds: number) => Promise<void>>;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function pageFor(
  item: unknown,
  options: {
    numOfRows?: number;
    pageNo?: number;
    totalCount?: number;
  } = {},
) {
  return {
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: {
        items: { item },
        pageNo: options.pageNo ?? 1,
        numOfRows: options.numOfRows ?? 100,
        totalCount: options.totalCount ?? 1,
      },
    },
  };
}

function createClient(
  options: {
    endpoint?: string;
    serviceKey?: string;
  } = {},
) {
  const fetch: FetchMock = jest.fn();
  const sleep: SleepMock = jest.fn(() => Promise.resolve());
  const config = {
    get: jest.fn((key: "END_POINT" | "SERVICE_KEY") => {
      if (key === "END_POINT") {
        return options.endpoint ?? "https://example.test/KorService2/";
      }

      return options.serviceKey ?? encodedServiceKey;
    }),
  };

  return {
    client: new TourApiClient(config as never, fetch, sleep),
    config,
    fetch,
    sleep,
  };
}

function requestUrl(fetch: FetchMock, call = 0): URL {
  const url = fetch.mock.calls[call]?.[0];

  if (url == null) {
    throw new Error(`Expected fetch call ${call + 1}`);
  }

  return url;
}

async function rejectedError(
  operation: () => Promise<unknown>,
): Promise<Error> {
  try {
    await operation();
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }

  throw new Error("Expected the operation to reject");
}

describe("TourApiClient", () => {
  it("resolves ConfigService through Nest injection metadata", async () => {
    const { config, fetch, sleep } = createClient();

    const module = await Test.createTestingModule({
      providers: [
        TourApiClient,
        { provide: ConfigService, useValue: config },
        { provide: TOUR_API_FETCH, useValue: fetch },
        { provide: TOUR_API_SLEEP, useValue: sleep },
      ],
    }).compile();

    await module.close();

    expect(module.get(TourApiClient)).toBeInstanceOf(TourApiClient);
  });

  it("calls areaBasedList2 with encoded credentials and fixed JSON parameters", async () => {
    const { client, config, fetch } = createClient();

    expect(config.get).not.toHaveBeenCalled();
    expect(typeof TOUR_API_PORT).toBe("symbol");
    expect(typeof TOUR_API_FETCH).toBe("symbol");
    expect(typeof TOUR_API_SLEEP).toBe("symbol");

    fetch.mockResolvedValueOnce(jsonResponse(pageResponse));

    await expect(
      client.getPlacePage({ regionCode: "50", pageNo: 3 }),
    ).resolves.toEqual({
      items: [placeItem],
      pageNo: 1,
      numOfRows: 100,
      totalCount: 1,
    });

    const url = requestUrl(fetch);
    expect(url.pathname).toBe("/KorService2/areaBasedList2");
    expect(url.searchParams.get("serviceKey")).toBe("portal+service/key=");
    expect(url.search).toContain("serviceKey=portal%2Bservice%2Fkey%3D");
    expect(url.searchParams.get("MobileOS")).toBe("ETC");
    expect(url.searchParams.get("MobileApp")).toBe("Haetteum");
    expect(url.searchParams.get("_type")).toBe("json");
    expect(url.searchParams.get("pageNo")).toBe("3");
    expect(url.searchParams.get("numOfRows")).toBe("100");
    expect(url.searchParams.get("contentTypeId")).toBe("12");
    expect(url.searchParams.get("lDongRegnCd")).toBe("50");
    expect(url.searchParams.get("arrange")).toBe("C");
    expect(config.get).toHaveBeenCalledWith("END_POINT", { infer: true });
    expect(config.get).toHaveBeenCalledWith("SERVICE_KEY", { infer: true });

    const rawKeyClient = createClient({ serviceKey: "portal+service/key=" });
    rawKeyClient.fetch.mockResolvedValueOnce(jsonResponse(pageResponse));

    await rawKeyClient.client.getPlacePage({ regionCode: "50", pageNo: 1 });

    expect(requestUrl(rawKeyClient.fetch).searchParams.get("serviceKey")).toBe(
      "portal+service/key=",
    );
  });

  it("calls searchFestival2 with the approved range and festival classification", async () => {
    const { client, fetch } = createClient();
    fetch.mockResolvedValueOnce(
      jsonResponse(pageFor(festivalItem, { pageNo: 2, totalCount: 101 })),
    );

    await expect(
      client.getFestivalPage({
        eventStartDate: "20260101",
        eventEndDate: "20271231",
        pageNo: 2,
      }),
    ).resolves.toMatchObject({ items: [festivalItem], pageNo: 2 });

    const url = requestUrl(fetch);
    expect(url.pathname).toBe("/KorService2/searchFestival2");
    expect(url.searchParams.get("eventStartDate")).toBe("20260101");
    expect(url.searchParams.get("eventEndDate")).toBe("20271231");
    expect(url.searchParams.get("lclsSystm1")).toBe("EV");
    expect(url.searchParams.get("lclsSystm2")).toBe("EV01");
    expect(url.searchParams.get("arrange")).toBe("C");
    expect(url.searchParams.get("pageNo")).toBe("2");
    expect(url.searchParams.get("numOfRows")).toBe("100");
    expect(typeof FESTIVAL_API_PORT).toBe("symbol");
  });

  it("normalizes a single item object, an item array, and empty items", async () => {
    const { client, fetch } = createClient();

    fetch
      .mockResolvedValueOnce(jsonResponse(pageFor(placeItem)))
      .mockResolvedValueOnce(jsonResponse(pageResponse))
      .mockResolvedValueOnce(
        jsonResponse(
          pageFor("", {
            numOfRows: 100,
            totalCount: 0,
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          response: {
            header: { resultCode: "0000", resultMsg: "OK" },
            body: { pageNo: 1, numOfRows: 100, totalCount: 0 },
          },
        }),
      );

    await expect(
      client.getPlacePage({ regionCode: "50", pageNo: 1 }),
    ).resolves.toMatchObject({ items: [placeItem] });
    await expect(
      client.getPlacePage({ regionCode: "50", pageNo: 1 }),
    ).resolves.toMatchObject({ items: [placeItem] });
    await expect(
      client.getPlacePage({ regionCode: "50", pageNo: 1 }),
    ).resolves.toEqual({
      items: [],
      pageNo: 1,
      numOfRows: 100,
      totalCount: 0,
    });
    await expect(
      client.getPlacePage({ regionCode: "50", pageNo: 1 }),
    ).resolves.toEqual({
      items: [],
      pageNo: 1,
      numOfRows: 100,
      totalCount: 0,
    });
  });

  it("throws a sanitized provider error for resultCode other than 0000", async () => {
    const serviceKey = "do-not-leak-provider-key";
    const { client, fetch, sleep } = createClient({ serviceKey });
    fetch.mockResolvedValueOnce(
      jsonResponse({
        response: {
          header: {
            resultCode: "22",
            resultMsg: "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR",
          },
          body: { items: "", pageNo: 1, numOfRows: 100, totalCount: 0 },
        },
      }),
    );

    const error = await rejectedError(() =>
      client.getPlacePage({ regionCode: "50", pageNo: 1 }),
    );

    expect(error).toBeInstanceOf(TourApiError);
    expect(error).toMatchObject({
      operation: "areaBasedList2",
      providerCode: "22",
      httpStatus: 200,
    });
    expect(error.message).toBe("TourAPI areaBasedList2 failed (22)");
    expect(JSON.stringify(error)).not.toContain(serviceKey);
    expect(error.message).not.toContain(serviceKey);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("detects an XML gateway error without exposing the service key", async () => {
    const serviceKey = "do-not-leak-xml-key";
    const { client, fetch } = createClient({ serviceKey });
    fetch.mockResolvedValueOnce(
      new Response(
        "<OpenAPI_ServiceResponse><cmmMsgHeader><returnReasonCode>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>",
        { status: 200, headers: { "content-type": "application/xml" } },
      ),
    );

    const error = await rejectedError(() =>
      client.getPlacePage({ regionCode: "50", pageNo: 1 }),
    );

    expect(error).toBeInstanceOf(TourApiError);
    expect(error).toMatchObject({
      operation: "areaBasedList2",
      providerCode: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
      httpStatus: 200,
    });
    expect(JSON.stringify(error)).not.toContain(serviceKey);
    expect(error.message).not.toContain(serviceKey);
  });

  it("retries timeout, 429, and 5xx twice but does not retry a validation error", async () => {
    const retryCases: Array<{
      failure: () => Promise<Response>;
      label: string;
    }> = [
      {
        label: "timeout",
        failure: () =>
          Promise.reject(new DOMException("Request timed out", "AbortError")),
      },
      {
        label: "429",
        failure: () => Promise.resolve(jsonResponse({}, 429)),
      },
      {
        label: "5xx",
        failure: () => Promise.resolve(jsonResponse({}, 503)),
      },
    ];

    for (const retryCase of retryCases) {
      const { client, fetch, sleep } = createClient();
      fetch
        .mockImplementationOnce(retryCase.failure)
        .mockImplementationOnce(retryCase.failure)
        .mockResolvedValueOnce(jsonResponse(pageResponse));

      await expect(
        client.getPlacePage({ regionCode: "50", pageNo: 1 }),
      ).resolves.toMatchObject({ items: [placeItem] });

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(sleep).toHaveBeenNthCalledWith(1, 250);
      expect(sleep).toHaveBeenNthCalledWith(2, 750);
    }

    const { client, fetch, sleep } = createClient();
    fetch.mockResolvedValueOnce(
      jsonResponse({
        response: {
          header: { resultCode: "0000", resultMsg: "OK" },
          body: { items: "", pageNo: 0, numOfRows: 100, totalCount: 0 },
        },
      }),
    );

    await expect(
      client.getPlacePage({ regionCode: "50", pageNo: 1 }),
    ).rejects.toMatchObject({
      operation: "areaBasedList2",
      providerCode: "INVALID_RESPONSE",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("supports ldongCode2, areaBasedSyncList2, and detailCommon2 parameters", async () => {
    const { client, fetch } = createClient();
    fetch
      .mockResolvedValueOnce(jsonResponse(pageFor(districtItem)))
      .mockResolvedValueOnce(jsonResponse(pageFor(changedPlaceItem)))
      .mockResolvedValueOnce(jsonResponse(pageFor(changedPlaceItem)))
      .mockResolvedValueOnce(
        jsonResponse(pageFor(detailItem, { numOfRows: 1 })),
      );

    await client.getDistrictPage({ regionCode: "50", pageNo: 2 });
    await client.getChangedPlacePage({
      regionCode: "50",
      modifiedDate: "20260824",
      showflag: "0",
      pageNo: 3,
    });
    await client.getChangedPlaceProbePage({
      regionCode: "50",
      showflag: "1",
      pageNo: 4,
    });
    await expect(client.getPlaceDetail(placeItem.contentid)).resolves.toEqual(
      detailItem,
    );

    const districtUrl = requestUrl(fetch, 0);
    expect(districtUrl.pathname).toBe("/KorService2/ldongCode2");
    expect(districtUrl.searchParams.get("lDongRegnCd")).toBe("50");
    expect(districtUrl.searchParams.get("lDongListYn")).toBe("Y");
    expect(districtUrl.searchParams.get("pageNo")).toBe("2");

    const changedUrl = requestUrl(fetch, 1);
    expect(changedUrl.pathname).toBe("/KorService2/areaBasedSyncList2");
    expect(changedUrl.searchParams.get("contentTypeId")).toBe("12");
    expect(changedUrl.searchParams.get("lDongRegnCd")).toBe("50");
    expect(changedUrl.searchParams.get("modifiedtime")).toBe("20260824");
    expect(changedUrl.searchParams.get("showflag")).toBe("0");
    expect(changedUrl.searchParams.get("arrange")).toBe("C");
    expect(changedUrl.searchParams.get("pageNo")).toBe("3");

    const probeUrl = requestUrl(fetch, 2);
    expect(probeUrl.pathname).toBe("/KorService2/areaBasedSyncList2");
    expect(probeUrl.searchParams.get("contentTypeId")).toBe("12");
    expect(probeUrl.searchParams.get("lDongRegnCd")).toBe("50");
    expect(probeUrl.searchParams.has("modifiedtime")).toBe(false);
    expect(probeUrl.searchParams.get("showflag")).toBe("1");
    expect(probeUrl.searchParams.get("arrange")).toBe("C");
    expect(probeUrl.searchParams.get("pageNo")).toBe("4");

    const detailUrl = requestUrl(fetch, 3);
    expect(detailUrl.pathname).toBe("/KorService2/detailCommon2");
    expect(detailUrl.searchParams.get("contentId")).toBe(placeItem.contentid);
    expect(detailUrl.searchParams.get("pageNo")).toBe("1");
    expect(detailUrl.searchParams.get("numOfRows")).toBe("1");
  });
});
