import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { parse } from "csv-parse/sync";

import {
  assertCsvHeader,
  readAudienceCsvFiles,
} from "../common/ranking-import/ranking-csv-files.js";
import { parseRankingDirectoryPeriod } from "../common/ranking-import/ranking-directory-period.js";
import {
  assertAudienceLabel,
  assertColumnCount,
  assertNonBlank,
  assertPattern,
  assertPercent,
  assertRank,
  AudienceRowOrderValidator,
  type RankingRowContext,
} from "../common/ranking-import/ranking-row-validators.js";
import {
  DATALAB_SOURCE,
  HOT_PLACE_AUDIENCE_FILE_LABELS,
  HOT_PLACE_AUDIENCE_ROW_VALUES,
  HOT_PLACE_ROWS_PER_AUDIENCE,
  NATIONAL_SCOPE,
} from "./hot-place-ranking.constants.js";

export type HotPlaceRankingAudienceDb =
  keyof typeof HOT_PLACE_AUDIENCE_FILE_LABELS;

export interface ParsedHotPlaceRankingRow {
  audience: HotPlaceRankingAudienceDb;
  rank: number;
  baseYearMonth: string;
  provinceName: string;
  districtName: string;
  sourcePlaceId: string;
  sourcePlaceName: string;
  sourceCategory: string;
  growthPercent: string;
  sourceFileName: string;
}

export interface ParsedHotPlaceRankingSnapshot {
  source: typeof DATALAB_SOURCE;
  scope: typeof NATIONAL_SCOPE;
  baseYearMonth: string;
  periodStart: Date;
  periodEnd: Date;
  rows: ParsedHotPlaceRankingRow[];
}

const BARE_AUDIENCE_FILE_PATTERN = /^세대별 핫플레이스\((.+)\)\.csv$/u;
const TIMESTAMPED_AUDIENCE_FILE_PATTERN =
  /^(\d{14})_세대별 핫플레이스\(([^)]+)\)(?: \(\d+\))?\.csv$/u;
const CSV_HEADER = [
  "순위",
  "기준년월",
  "시도명",
  "시군구명",
  "관광지ID",
  "관심지점명",
  "구분",
  "연령대",
  "성장율",
];
const ROWS_PER_AUDIENCE = HOT_PLACE_ROWS_PER_AUDIENCE;
const BASE_YEAR_MONTH_PATTERN = /^\d{6}$/u;
const SOURCE_PLACE_ID_PATTERN = /^[0-9a-f]{32}$/iu;
const MAX_GROWTH_PERCENT = 100_000;

const audienceEntries = Object.entries(HOT_PLACE_AUDIENCE_FILE_LABELS) as [
  HotPlaceRankingAudienceDb,
  (typeof HOT_PLACE_AUDIENCE_FILE_LABELS)[HotPlaceRankingAudienceDb],
][];

export async function parseHotPlaceRankingDirectory(
  directory: string,
): Promise<ParsedHotPlaceRankingSnapshot> {
  const { downloadTimestamp, startMonth, endMonth, periodStart, periodEnd } =
    parseRankingDirectoryPeriod(directory);
  const sourceFiles = await readAudienceCsvFiles(directory, downloadTimestamp, {
    barePattern: BARE_AUDIENCE_FILE_PATTERN,
    timestampedPattern: TIMESTAMPED_AUDIENCE_FILE_PATTERN,
    audienceLabels: audienceEntries.map(([, label]) => label),
    fileNameForLabel,
  });
  const rows: ParsedHotPlaceRankingRow[] = [];
  const expectedFileNames = new Set<string>();
  const baseYearMonths = new Set<string>();

  for (const [audience, label] of audienceEntries) {
    const fileName = fileNameForLabel(downloadTimestamp, label);
    expectedFileNames.add(fileName);
    const sourceFile = sourceFiles.get(fileName);

    if (sourceFile === undefined) {
      throw new Error(`Missing required audience file: ${fileName}`);
    }

    const audienceRows = await parseAudienceFile(
      directory,
      sourceFile.actualFileName,
      sourceFile.sourceFileName,
      audience,
      HOT_PLACE_AUDIENCE_ROW_VALUES[audience],
    );

    for (const row of audienceRows) {
      baseYearMonths.add(row.baseYearMonth);
    }
    rows.push(...audienceRows);
  }

  for (const fileName of sourceFiles.keys()) {
    if (!expectedFileNames.has(fileName)) {
      throw new Error(`Unexpected ranking CSV file: ${fileName}`);
    }
  }

  if (baseYearMonths.size !== 1) {
    throw new Error("Invalid base year month: files disagree on 기준년월");
  }

  const [baseYearMonth] = [...baseYearMonths];

  if (
    baseYearMonth === undefined ||
    baseYearMonth < startMonth ||
    baseYearMonth > endMonth
  ) {
    throw new Error("Invalid base year month: outside the directory period");
  }

  return {
    source: DATALAB_SOURCE,
    scope: NATIONAL_SCOPE,
    baseYearMonth,
    periodStart,
    periodEnd,
    rows,
  };
}

async function parseAudienceFile(
  directory: string,
  actualFileName: string,
  sourceFileName: string,
  audience: HotPlaceRankingAudienceDb,
  expectedLabel: string,
): Promise<ParsedHotPlaceRankingRow[]> {
  const rawCsv = await readFile(join(directory, actualFileName), "utf8");
  const records: string[][] = parse(rawCsv.replace(/^\uFEFF/u, ""), {
    skip_empty_lines: true,
  });

  assertCsvHeader(records[0], CSV_HEADER, sourceFileName);

  const dataRows = records.slice(1);

  if (dataRows.length !== ROWS_PER_AUDIENCE) {
    throw new Error(
      `Invalid row count in ${sourceFileName}: expected ${ROWS_PER_AUDIENCE}`,
    );
  }

  const validator = new AudienceRowOrderValidator<ParsedHotPlaceRankingRow>(
    sourceFileName,
    ROWS_PER_AUDIENCE,
    "growth percent",
    (row) => row.growthPercent,
  );
  const seenBaseYearMonths = new Set<string>();
  const parsedRows: ParsedHotPlaceRankingRow[] = [];

  for (const [index, columns] of dataRows.entries()) {
    const rowNumber = index + 2;
    const parsedRow = parseRankingRow(
      columns,
      rowNumber,
      sourceFileName,
      audience,
      expectedLabel,
    );

    validator.check(parsedRow, index, rowNumber);
    seenBaseYearMonths.add(parsedRow.baseYearMonth);
    parsedRows.push(parsedRow);
  }

  validator.assertNoMissingRanks();

  if (seenBaseYearMonths.size !== 1) {
    throw new Error(`Inconsistent 기준년월 in ${sourceFileName}`);
  }

  return parsedRows;
}

function parseRankingRow(
  columns: string[],
  rowNumber: number,
  sourceFileName: string,
  audience: HotPlaceRankingAudienceDb,
  expectedLabel: string,
): ParsedHotPlaceRankingRow {
  const ctx: RankingRowContext = { sourceFileName, rowNumber };

  assertColumnCount(columns, CSV_HEADER.length, ctx);

  const [
    baseYearMonth,
    provinceName,
    districtName,
    sourcePlaceId,
    name,
    category,
    audienceLabel,
    growthPercent,
  ] = columns.slice(1).map((column) => column.trim());
  const rankToken = columns[0] ?? "";
  const rank = assertRank(rankToken, ROWS_PER_AUDIENCE, ctx);
  const validatedBaseYearMonth = assertPattern(
    baseYearMonth,
    BASE_YEAR_MONTH_PATTERN,
    "base year month",
    ctx,
  );
  const validatedProvinceName = assertNonBlank(
    provinceName,
    "province name",
    ctx,
  );
  const validatedDistrictName = assertNonBlank(
    districtName,
    "district name",
    ctx,
  );

  assertAudienceLabel(audienceLabel, expectedLabel, ctx);

  const validatedSourcePlaceId = assertPattern(
    sourcePlaceId,
    SOURCE_PLACE_ID_PATTERN,
    "source place id",
    ctx,
  );
  const validatedName = assertNonBlank(name, "place name", ctx);
  const validatedCategory = assertNonBlank(category, "category", ctx);
  const validatedGrowthPercent = assertPercent(
    growthPercent,
    "growth percent",
    MAX_GROWTH_PERCENT,
    ctx,
  );

  return {
    audience,
    rank,
    baseYearMonth: validatedBaseYearMonth,
    provinceName: validatedProvinceName,
    districtName: validatedDistrictName,
    sourcePlaceId: validatedSourcePlaceId,
    sourcePlaceName: validatedName,
    sourceCategory: validatedCategory,
    growthPercent: validatedGrowthPercent,
    sourceFileName,
  };
}

function fileNameForLabel(timestamp: string, label: string): string {
  return `${timestamp}_세대별 핫플레이스(${label}).csv`;
}
