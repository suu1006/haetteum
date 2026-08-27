import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

import { parse } from "csv-parse/sync";

import {
  AUDIENCE_FILE_LABELS,
  AUDIENCE_ROW_VALUES,
  DATALAB_SOURCE,
  NATIONAL_SCOPE,
} from "./place-ranking.constants.js";

export type RankingAudienceDb = keyof typeof AUDIENCE_FILE_LABELS;

export interface ParsedPlaceRankingRow {
  audience: RankingAudienceDb;
  rank: number;
  sourcePlaceId: string;
  sourcePlaceName: string;
  sourceCategory: string;
  sharePercent: string;
  sourceFileName: string;
}

export interface ParsedPlaceRankingSnapshot {
  source: typeof DATALAB_SOURCE;
  scope: typeof NATIONAL_SCOPE;
  periodStart: Date;
  periodEnd: Date;
  rows: ParsedPlaceRankingRow[];
}

const DIRECTORY_PATTERN = /^\d{14}_전국_(\d{6})-(\d{6})_데이터랩_다운로드$/u;
const BARE_AUDIENCE_FILE_PATTERN = /^세대별 인기관광지\((.+)\)\.csv$/u;
const TIMESTAMPED_AUDIENCE_FILE_PATTERN =
  /^(\d{14})_세대별 인기관광지\(([^)]+)\)(?: \(\d+\))?\.csv$/u;
const CSV_HEADER = ["순위", "관광지ID", "관심지점명", "구분", "연령대", "비율"];
const ROWS_PER_AUDIENCE = 30;
const RANK_PATTERN = /^\d+$/u;
const SOURCE_PLACE_ID_PATTERN = /^[0-9a-f]{32}$/iu;
const SHARE_PERCENT_PATTERN = /^\d+(?:\.\d{1,2})?$/u;

const audienceEntries = Object.entries(AUDIENCE_FILE_LABELS) as [
  RankingAudienceDb,
  (typeof AUDIENCE_FILE_LABELS)[RankingAudienceDb],
][];

export async function parsePlaceRankingDirectory(
  directory: string,
): Promise<ParsedPlaceRankingSnapshot> {
  const { downloadTimestamp, periodStart, periodEnd } =
    parseDirectoryPeriod(directory);
  const sourceFiles = await readRankingFiles(directory, downloadTimestamp);
  const rows: ParsedPlaceRankingRow[] = [];
  const expectedFileNames = new Set<string>();

  for (const [audience, label] of audienceEntries) {
    const fileName = fileNameForLabel(downloadTimestamp, label);
    expectedFileNames.add(fileName);
    const sourceFile = sourceFiles.get(fileName);

    if (sourceFile === undefined) {
      throw new Error(`Missing required audience file: ${fileName}`);
    }

    rows.push(
      ...(await parseAudienceFile(
        directory,
        sourceFile.actualFileName,
        sourceFile.sourceFileName,
        audience,
        AUDIENCE_ROW_VALUES[audience],
      )),
    );
  }

  for (const fileName of sourceFiles.keys()) {
    if (!expectedFileNames.has(fileName)) {
      throw new Error(`Unexpected ranking CSV file: ${fileName}`);
    }
  }

  return {
    source: DATALAB_SOURCE,
    scope: NATIONAL_SCOPE,
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
  audience: RankingAudienceDb,
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
  const parsedRows: ParsedPlaceRankingRow[] = [];
  let previousSharePercent: number | undefined;

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
      previousSharePercent !== undefined &&
      Number.parseFloat(parsedRow.sharePercent) > previousSharePercent
    ) {
      throw new Error(
        `Invalid share percent order in ${sourceFileName} at row ${rowNumber}`,
      );
    }

    seenRanks.add(parsedRow.rank);
    seenSourcePlaceIds.add(normalizedSourcePlaceId);
    previousSharePercent = Number.parseFloat(parsedRow.sharePercent);
    parsedRows.push(parsedRow);
  }

  for (let rank = 1; rank <= ROWS_PER_AUDIENCE; rank += 1) {
    if (!seenRanks.has(rank)) {
      throw new Error(`Missing rank ${rank} in ${sourceFileName}`);
    }
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
  audience: RankingAudienceDb,
  expectedLabel: string,
): ParsedPlaceRankingRow {
  if (columns.length !== CSV_HEADER.length) {
    throw new Error(
      `Invalid column count in ${sourceFileName} at row ${rowNumber}`,
    );
  }

  const [sourcePlaceId, name, category, audienceLabel, sharePercent] = columns
    .slice(1)
    .map((column) => column.trim());
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
    sharePercent === undefined ||
    !SHARE_PERCENT_PATTERN.test(sharePercent) ||
    Number.parseFloat(sharePercent) <= 0 ||
    Number.parseFloat(sharePercent) > 100
  ) {
    throw new Error(
      `Invalid share percent in ${sourceFileName} at row ${rowNumber}`,
    );
  }

  return {
    audience,
    rank,
    sourcePlaceId,
    sourcePlaceName: name,
    sourceCategory: category,
    sharePercent,
    sourceFileName,
  };
}

function fileNameForLabel(timestamp: string, label: string) {
  return `${timestamp}_세대별 인기관광지(${label}).csv`;
}
