import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NestFactory } from "@nestjs/core";

import { TOUR_API_PORT } from "./tourism.constants.js";
import type { TourApiPort } from "./tour-api.types.js";

const SMOKE_REGION_CODE = "50";
const FIRST_PAGE = 1;
const SAFE_COMMAND_ERROR = "Tourism smoke command failed.";
const SAFE_DETAIL_MISMATCH = "Tourism smoke detail content ID mismatch";

type SmokeOutput = (message: string) => void;

function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function printPageResult(
  input: {
    operation: string;
    totalCount: number;
    sampleContentId: string | null;
    sampleTitle: string | null;
  },
  output: SmokeOutput,
): void {
  output(
    JSON.stringify({
      operation: input.operation,
      httpStatus: 200,
      providerResultCode: "0000",
      totalCount: input.totalCount,
      sampleContentId: input.sampleContentId,
      sampleTitle: input.sampleTitle,
    }),
  );
}

function requireFirstContentId(contentId: string | undefined): string {
  const normalized = optionalText(contentId);
  if (normalized == null) {
    throw new Error("Tourism smoke command requires an area-based content ID");
  }

  return normalized;
}

export async function runTourismSmoke(
  provider: TourApiPort,
  output: SmokeOutput,
): Promise<void> {
  const districts = await provider.getDistrictPage({
    regionCode: SMOKE_REGION_CODE,
    pageNo: FIRST_PAGE,
  });
  const district = districts.items[0];
  printPageResult(
    {
      operation: "ldongCode2",
      totalCount: districts.totalCount,
      sampleContentId: null,
      sampleTitle: optionalText(district?.lDongSignguNm),
    },
    output,
  );

  const places = await provider.getPlacePage({
    regionCode: SMOKE_REGION_CODE,
    pageNo: FIRST_PAGE,
  });
  const place = places.items[0];
  const contentId = requireFirstContentId(place?.contentid);
  printPageResult(
    {
      operation: "areaBasedList2",
      totalCount: places.totalCount,
      sampleContentId: contentId,
      sampleTitle: optionalText(place?.title),
    },
    output,
  );

  const changedPlaces = await provider.getChangedPlaceProbePage({
    regionCode: SMOKE_REGION_CODE,
    showflag: "1",
    pageNo: FIRST_PAGE,
  });
  const changedPlace = changedPlaces.items[0];
  printPageResult(
    {
      operation: "areaBasedSyncList2",
      totalCount: changedPlaces.totalCount,
      sampleContentId: optionalText(changedPlace?.contentid),
      sampleTitle: optionalText(changedPlace?.title),
    },
    output,
  );

  const detail = await provider.getPlaceDetail(contentId);
  const detailContentId = optionalText(detail.contentid);
  if (detailContentId !== contentId) {
    throw new Error(SAFE_DETAIL_MISMATCH);
  }

  output(
    JSON.stringify({
      operation: "detailCommon2",
      httpStatus: 200,
      providerResultCode: "0000",
      totalCount: 1,
      sampleContentId: detailContentId,
      sampleTitle: optionalText(detail.title) ?? optionalText(place?.title),
      hasOverview: optionalText(detail.overview) != null,
      hasHomepage: optionalText(detail.homepage) != null,
    }),
  );
}

export async function executeTourismSmoke(
  provider: TourApiPort,
  output: SmokeOutput,
  errorOutput: SmokeOutput,
): Promise<number> {
  try {
    await runTourismSmoke(provider, output);
    return 0;
  } catch {
    errorOutput(SAFE_COMMAND_ERROR);
    return 1;
  }
}

async function run(): Promise<void> {
  let app:
    | Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
    | undefined;

  try {
    const { AppModule } = await import("../app.module.js");
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    const provider = app.get<TourApiPort>(TOUR_API_PORT);
    const exitCode = await executeTourismSmoke(
      provider,
      (message) => console.log(message),
      (message) => console.error(message),
    );

    if (exitCode !== 0) process.exitCode = exitCode;
  } catch {
    console.error(SAFE_COMMAND_ERROR);
    process.exitCode = 1;
  } finally {
    if (app != null) {
      try {
        await app.close();
      } catch {
        console.error("Tourism smoke command shutdown failed.");
        process.exitCode = 1;
      }
    }
  }
}

function isMainModule(): boolean {
  const commandPath = process.argv[1];

  return (
    commandPath !== undefined &&
    resolve(commandPath) === fileURLToPath(import.meta.url)
  );
}

if (isMainModule()) {
  void run();
}
