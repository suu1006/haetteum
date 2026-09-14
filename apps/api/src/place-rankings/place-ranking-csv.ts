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

const BARE_AUDIENCE_FILE_PATTERN = /^세대별 인기관광지\((.+)\)\.csv$/u;
const TIMESTAMPED_AUDIENCE_FILE_PATTERN =
  /^(\d{14})_세대별 인기관광지\(([^)]+)\)(?: \(\d+\))?\.csv$/u;
const CSV_HEADER = ["순위", "관광지ID", "관심지점명", "구분", "연령대", "비율"];
const ROWS_PER_AUDIENCE = 30;
const SOURCE_PLACE_ID_PATTERN = /^[0-9a-f]{32}$/iu;
const SHARE_PERCENT_MAX = 100;

const audienceEntries = Object.entries(AUDIENCE_FILE_LABELS) as [
  RankingAudienceDb,
  (typeof AUDIENCE_FILE_LABELS)[RankingAudienceDb],
][];

export async function parsePlaceRankingDirectory(
  directory: string,
): Promise<ParsedPlaceRankingSnapshot> {
  const { downloadTimestamp, periodStart, periodEnd } =
    parseRankingDirectoryPeriod(directory);
  const sourceFiles = await readAudienceCsvFiles(directory, downloadTimestamp, {
    barePattern: BARE_AUDIENCE_FILE_PATTERN,
    timestampedPattern: TIMESTAMPED_AUDIENCE_FILE_PATTERN,
    audienceLabels: audienceEntries.map(([, label]) => label),
    fileNameForLabel,
  });
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

async function parseAudienceFile(
  directory: string,
  actualFileName: string,
  sourceFileName: string,
  audience: RankingAudienceDb,
  expectedLabel: string,
): Promise<ParsedPlaceRankingRow[]> {
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

  const validator = new AudienceRowOrderValidator<ParsedPlaceRankingRow>(
    sourceFileName,
    ROWS_PER_AUDIENCE,
    "share percent",
    (row) => row.sharePercent,
  );
  const parsedRows: ParsedPlaceRankingRow[] = [];

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
    parsedRows.push(parsedRow);
  }

  validator.assertNoMissingRanks();

  return parsedRows;
}

function parseRankingRow(
  columns: string[],
  rowNumber: number,
  sourceFileName: string,
  audience: RankingAudienceDb,
  expectedLabel: string,
): ParsedPlaceRankingRow {
  const ctx: RankingRowContext = { sourceFileName, rowNumber };

  assertColumnCount(columns, CSV_HEADER.length, ctx);

  const [sourcePlaceId, name, category, audienceLabel, sharePercent] = columns
    .slice(1)
    .map((column) => column.trim());
  const rankToken = columns[0] ?? "";
  const rank = assertRank(rankToken, ROWS_PER_AUDIENCE, ctx);

  assertAudienceLabel(audienceLabel, expectedLabel, ctx);

  return {
    audience,
    rank,
    sourcePlaceId: assertPattern(
      sourcePlaceId,
      SOURCE_PLACE_ID_PATTERN,
      "source place id",
      ctx,
    ),
    sourcePlaceName: assertNonBlank(name, "place name", ctx),
    sourceCategory: assertNonBlank(category, "category", ctx),
    sharePercent: assertPercent(
      sharePercent,
      "share percent",
      SHARE_PERCENT_MAX,
      ctx,
    ),
    sourceFileName,
  };
}

function fileNameForLabel(timestamp: string, label: string): string {
  return `${timestamp}_세대별 인기관광지(${label}).csv`;
}
