import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

import { parse } from "csv-parse/sync";

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

const DIRECTORY_PATTERN = /^\d{14}_전국_(\d{6})-(\d{6})_데이터랩_다운로드$/u;
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
const RANK_PATTERN = /^\d+$/u;
const BASE_YEAR_MONTH_PATTERN = /^\d{6}$/u;
const SOURCE_PLACE_ID_PATTERN = /^[0-9a-f]{32}$/iu;
const GROWTH_PERCENT_PATTERN = /^\d+(?:\.\d{1,2})?$/u;
const MAX_GROWTH_PERCENT = 100_000;

const audienceEntries = Object.entries(HOT_PLACE_AUDIENCE_FILE_LABELS) as [
  HotPlaceRankingAudienceDb,
  (typeof HOT_PLACE_AUDIENCE_FILE_LABELS)[HotPlaceRankingAudienceDb],
][];

export async function parseHotPlaceRankingDirectory(
  directory: string,
): Promise<ParsedHotPlaceRankingSnapshot> {
  const { downloadTimestamp, startMonth, endMonth, periodStart, periodEnd } =
    parseDirectoryPeriod(directory);
  const sourceFiles = await readRankingFiles(directory, downloadTimestamp);
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

function parseDirectoryPeriod(directory: string) {
  const directoryBaseName = basename(directory).normalize("NFC");
  const match = DIRECTORY_PATTERN.exec(directoryBaseName);

  if (match === null) {
    throw new Error("Invalid directory period: directory name is malformed");
  }

  const [, startMonth, endMonth] = match;

  if (startMonth === undefined || endMonth === undefined) {
    throw new Error("Invalid directory period: period is missing");
  }

  if (endMonth < startMonth) {
    throw new Error("Invalid directory period: end month precedes start month");
  }

  return {
    downloadTimestamp: directoryBaseName.slice(0, 14),
    startMonth,
    endMonth,
    periodStart: monthStartUtc(startMonth),
    periodEnd: monthEndUtc(endMonth),
  };
}

function monthStartUtc(yyyymm: string) {
  const year = Number.parseInt(yyyymm.slice(0, 4), 10);
  const monthIndex = Number.parseInt(yyyymm.slice(4, 6), 10) - 1;

  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) {
    throw new Error("Invalid directory period: month is out of range");
  }

  return new Date(Date.UTC(year, monthIndex, 1));
}

function monthEndUtc(yyyymm: string) {
  const year = Number.parseInt(yyyymm.slice(0, 4), 10);
  const monthIndex = Number.parseInt(yyyymm.slice(4, 6), 10) - 1;

  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) {
    throw new Error("Invalid directory period: month is out of range");
  }

  return new Date(Date.UTC(year, monthIndex + 1, 0));
}

async function readRankingFiles(directory: string, expectedTimestamp: string) {
  const directoryEntries = await readdir(directory);
  const normalizedFiles = new Map<
    string,
    { actualFileName: string; sourceFileName: string }
  >();
  const seenAudienceLabels = new Set<string>();

  for (const entry of directoryEntries) {
    const normalized = entry.normalize("NFC");

    if (!normalized.endsWith(".csv")) {
      continue;
    }

    if (normalizedFiles.has(normalized)) {
      throw new Error(`Duplicate normalized file name: ${normalized}`);
    }

    if (BARE_AUDIENCE_FILE_PATTERN.test(normalized)) {
      throw new Error(
        `Invalid timestamp prefix in audience file name: ${normalized}`,
      );
    }

    const match = TIMESTAMPED_AUDIENCE_FILE_PATTERN.exec(normalized);

    if (match === null) {
      throw new Error(`Unexpected ranking CSV file: ${normalized}`);
    }

    const [, fileTimestamp, audienceLabel] = match;

    if (fileTimestamp !== expectedTimestamp) {
      throw new Error(
        `Invalid timestamp prefix in audience file name: ${normalized}`,
      );
    }

    const expectedAudience = audienceEntries.find(
      ([, label]) => label === audienceLabel,
    );

    if (expectedAudience === undefined) {
      throw new Error(`Unexpected ranking CSV file: ${normalized}`);
    }

    const expectedFileName = fileNameForLabel(expectedTimestamp, audienceLabel);

    if (
      seenAudienceLabels.has(audienceLabel) ||
      normalized !== expectedFileName
    ) {
      throw new Error(`Duplicate audience CSV file: ${normalized}`);
    }

    seenAudienceLabels.add(audienceLabel);
    normalizedFiles.set(normalized, {
      actualFileName: entry,
      sourceFileName: normalized,
    });
  }

  return normalizedFiles;
}

async function parseAudienceFile(
  directory: string,
  actualFileName: string,
  sourceFileName: string,
  audience: HotPlaceRankingAudienceDb,
  expectedLabel: string,
) {
  const rawCsv = await readFile(join(directory, actualFileName), "utf8");
  const records: string[][] = parse(rawCsv.replace(/^\uFEFF/u, ""), {
    skip_empty_lines: true,
  });

  assertHeader(records[0], sourceFileName);

  const dataRows = records.slice(1);

  if (dataRows.length !== ROWS_PER_AUDIENCE) {
    throw new Error(
      `Invalid row count in ${sourceFileName}: expected ${ROWS_PER_AUDIENCE}`,
    );
  }

  const seenRanks = new Set<number>();
  const seenSourcePlaceIds = new Set<string>();
  const seenBaseYearMonths = new Set<string>();
  const parsedRows: ParsedHotPlaceRankingRow[] = [];
  let previousGrowthPercent: number | undefined;

  for (const [index, columns] of dataRows.entries()) {
    const rowNumber = index + 2;
    const parsedRow = parseRankingRow(
      columns,
      rowNumber,
      sourceFileName,
      audience,
      expectedLabel,
    );
    const normalizedSourcePlaceId = parsedRow.sourcePlaceId.toLowerCase();

    if (seenRanks.has(parsedRow.rank)) {
      throw new Error(
        `Duplicate rank in ${sourceFileName} at row ${rowNumber}`,
      );
    }

    if (parsedRow.rank !== index + 1) {
      throw new Error(
        `Invalid rank order in ${sourceFileName} at row ${rowNumber}`,
      );
    }

    if (seenSourcePlaceIds.has(normalizedSourcePlaceId)) {
      throw new Error(
        `Duplicate source place id in ${sourceFileName} at row ${rowNumber}`,
      );
    }

    if (
      previousGrowthPercent !== undefined &&
      Number.parseFloat(parsedRow.growthPercent) > previousGrowthPercent
    ) {
      throw new Error(
        `Invalid growth percent order in ${sourceFileName} at row ${rowNumber}`,
      );
    }

    seenRanks.add(parsedRow.rank);
    seenSourcePlaceIds.add(normalizedSourcePlaceId);
    seenBaseYearMonths.add(parsedRow.baseYearMonth);
    previousGrowthPercent = Number.parseFloat(parsedRow.growthPercent);
    parsedRows.push(parsedRow);
  }

  for (let rank = 1; rank <= ROWS_PER_AUDIENCE; rank += 1) {
    if (!seenRanks.has(rank)) {
      throw new Error(`Missing rank ${rank} in ${sourceFileName}`);
    }
  }

  if (seenBaseYearMonths.size !== 1) {
    throw new Error(`Inconsistent 기준년월 in ${sourceFileName}`);
  }

  return parsedRows;
}

function assertHeader(header: string[] | undefined, sourceFileName: string) {
  if (
    header === undefined ||
    header.length !== CSV_HEADER.length ||
    header.some((column, index) => column !== CSV_HEADER[index])
  ) {
    throw new Error(`Invalid CSV header in ${sourceFileName}`);
  }
}

function parseRankingRow(
  columns: string[],
  rowNumber: number,
  sourceFileName: string,
  audience: HotPlaceRankingAudienceDb,
  expectedLabel: string,
): ParsedHotPlaceRankingRow {
  if (columns.length !== CSV_HEADER.length) {
    throw new Error(
      `Invalid column count in ${sourceFileName} at row ${rowNumber}`,
    );
  }

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
  const rank = Number.parseInt(rankToken, 10);

  if (
    !RANK_PATTERN.test(rankToken) ||
    !Number.isInteger(rank) ||
    rank < 1 ||
    rank > ROWS_PER_AUDIENCE
  ) {
    throw new Error(`Invalid rank in ${sourceFileName} at row ${rowNumber}`);
  }

  if (
    baseYearMonth === undefined ||
    !BASE_YEAR_MONTH_PATTERN.test(baseYearMonth)
  ) {
    throw new Error(
      `Invalid base year month in ${sourceFileName} at row ${rowNumber}`,
    );
  }

  if (provinceName === undefined || provinceName.length === 0) {
    throw new Error(
      `Blank province name in ${sourceFileName} at row ${rowNumber}`,
    );
  }

  if (districtName === undefined || districtName.length === 0) {
    throw new Error(
      `Blank district name in ${sourceFileName} at row ${rowNumber}`,
    );
  }

  if (audienceLabel !== expectedLabel) {
    throw new Error(
      `Audience mismatch in ${sourceFileName} at row ${rowNumber}`,
    );
  }

  if (
    sourcePlaceId === undefined ||
    !SOURCE_PLACE_ID_PATTERN.test(sourcePlaceId)
  ) {
    throw new Error(
      `Invalid source place id in ${sourceFileName} at row ${rowNumber}`,
    );
  }

  if (name === undefined || name.length === 0) {
    throw new Error(
      `Blank place name in ${sourceFileName} at row ${rowNumber}`,
    );
  }

  if (category === undefined || category.length === 0) {
    throw new Error(`Blank category in ${sourceFileName} at row ${rowNumber}`);
  }

  if (
    growthPercent === undefined ||
    !GROWTH_PERCENT_PATTERN.test(growthPercent) ||
    Number.parseFloat(growthPercent) <= 0 ||
    Number.parseFloat(growthPercent) > MAX_GROWTH_PERCENT
  ) {
    throw new Error(
      `Invalid growth percent in ${sourceFileName} at row ${rowNumber}`,
    );
  }

  return {
    audience,
    rank,
    baseYearMonth,
    provinceName,
    districtName,
    sourcePlaceId,
    sourcePlaceName: name,
    sourceCategory: category,
    growthPercent,
    sourceFileName,
  };
}

function fileNameForLabel(timestamp: string, label: string) {
  return `${timestamp}_세대별 핫플레이스(${label}).csv`;
}
