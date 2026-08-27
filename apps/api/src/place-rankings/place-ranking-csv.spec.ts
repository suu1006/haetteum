import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { parsePlaceRankingDirectory } from "./place-ranking-csv.js";

const CSV_HEADER = "\uFEFF순위,관광지ID,관심지점명,구분,연령대,비율";
const OLD_DASHBOARD_CSV_HEADER = "순위,연령대,관광지ID,이름,구분,비중(%)";
const DOWNLOAD_TIMESTAMP = "20260825164520";

const audienceFileLabels = {
  ALL: "전체",
  TWENTIES: "20대",
  THIRTIES: "30대",
  FORTIES: "40대",
  FIFTIES: "50대",
  SIXTIES_PLUS: "60대이상",
} as const;

const audienceRowValues = {
  ALL: "전체",
  TWENTIES: "20",
  THIRTIES: "30",
  FORTIES: "40",
  FIFTIES: "50",
  SIXTIES_PLUS: "60",
} as const;

type Audience = keyof typeof audienceFileLabels;

const audiences = Object.keys(audienceFileLabels) as Audience[];

async function makeTempRoot() {
  return mkdtemp(join(tmpdir(), "haetteum-place-ranking-"));
}

function directoryName(period = "202508-202607") {
  return `${DOWNLOAD_TIMESTAMP}_전국_${period}_데이터랩_다운로드`;
}

function sourcePlaceId(audienceIndex: number, rank: number) {
  return `${audienceIndex.toString(16).padStart(2, "0")}${rank
    .toString(16)
    .padStart(2, "0")}${"a".repeat(28)}`;
}

function rankingRows(audience: Audience, audienceIndex: number) {
  const rowAudience = audienceRowValues[audience];

  return Array.from({ length: 30 }, (_, index) => {
    const rank = index + 1;
    const sharePercent = (9.1 - rank * 0.1).toFixed(1);

    return [
      rank.toString(),
      sourcePlaceId(audienceIndex, rank),
      rank === 1 ? "에버랜드" : `관광지 ${rank}`,
      rank === 1 ? "레저/스포츠" : "문화시설",
      rowAudience,
      rank === 1 ? `${sharePercent}\t` : sharePercent,
    ].join(",");
  });
}

function csvForAudience(audience: Audience, audienceIndex: number) {
  return [CSV_HEADER, ...rankingRows(audience, audienceIndex), ""].join("\n");
}

function fileNameForAudience(
  audience: Audience,
  timestamp: string | null = DOWNLOAD_TIMESTAMP,
) {
  const fileName = `세대별 인기관광지(${audienceFileLabels[audience]}).csv`;

  return timestamp === null ? fileName : `${timestamp}_${fileName}`;
}

async function writeValidDirectory(root: string, period?: string) {
  const directory = join(root, directoryName(period));

  await mkdir(directory);

  await Promise.all(
    audiences.map((audience, index) =>
      writeFile(
        join(directory, fileNameForAudience(audience)),
        csvForAudience(audience, index),
        "utf8",
      ),
    ),
  );

  return directory;
}

async function withRankingDirectory(
  options: {
    fileTimestamp?: string | null;
    mutate?: (
      files: Record<Audience, string>,
    ) =>
      | Promise<Partial<Record<Audience, string>> | void>
      | Partial<Record<Audience, string>>
      | void;
    extraFiles?: Record<string, string>;
    period?: string;
  } = {},
) {
  const {
    fileTimestamp = DOWNLOAD_TIMESTAMP,
    mutate,
    extraFiles = {},
    period,
  } = options;
  const root = await makeTempRoot();
  const directory = join(root, directoryName(period));
  const files = Object.fromEntries(
    audiences.map((audience, index) => [
      audience,
      csvForAudience(audience, index),
    ]),
  ) as Record<Audience, string>;

  try {
    const mutatedFiles = (await mutate?.(files)) ?? files;

    await mkdir(directory);

    await Promise.all(
      Object.entries(mutatedFiles).map(([audience, contents]) =>
        writeFile(
          join(
            directory,
            fileNameForAudience(audience as Audience, fileTimestamp),
          ),
          contents,
          "utf8",
        ),
      ),
    );

    await Promise.all(
      Object.entries(extraFiles).map(([fileName, contents]) =>
        writeFile(join(directory, fileName), contents, "utf8"),
      ),
    );

    return { directory, root };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

function replaceLine(
  csv: string,
  lineIndex: number,
  update: (columns: string[]) => string[],
) {
  const lines = csv.trimEnd().split("\n");
  lines[lineIndex] = update(lines[lineIndex]?.split(",") ?? []).join(",");
  return `${lines.join("\n")}\n`;
}

describe("parsePlaceRankingDirectory", () => {
  let roots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
    roots = [];
  });

  it("parses the strict six-file national ranking snapshot", async () => {
    const root = await makeTempRoot();
    roots.push(root);

    const directory = await writeValidDirectory(root);

    await expect(parsePlaceRankingDirectory(directory)).resolves.toMatchObject({
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      periodStart: new Date("2025-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    });

    const snapshot = await parsePlaceRankingDirectory(directory);

    expect(snapshot.rows).toHaveLength(180);
    expect(snapshot.rows[0]).toMatchObject({
      audience: "ALL",
      rank: 1,
      sourcePlaceId: "0001aaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      sourcePlaceName: "에버랜드",
      sourceCategory: "레저/스포츠",
      sharePercent: "9.0",
      sourceFileName: `${DOWNLOAD_TIMESTAMP}_세대별 인기관광지(전체).csv`,
    });
  });

  it("rejects bare audience filenames without the download timestamp prefix", async () => {
    const { directory, root } = await withRankingDirectory({
      fileTimestamp: null,
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /timestamp prefix/i,
    );
  });

  it("rejects audience filenames with a different timestamp prefix", async () => {
    const { directory, root } = await withRankingDirectory({
      fileTimestamp: "20260825170000",
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /timestamp prefix/i,
    );
  });

  it("rejects duplicate audience CSVs after timestamp-prefix parsing", async () => {
    const { directory, root } = await withRankingDirectory({
      extraFiles: {
        [`${DOWNLOAD_TIMESTAMP}_세대별 인기관광지(전체) (1).csv`]:
          csvForAudience("ALL", 0),
      },
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /duplicate audience/i,
    );
  });

  it("rejects unexpected extra CSV files", async () => {
    const { directory, root } = await withRankingDirectory({
      extraFiles: {
        [`${DOWNLOAD_TIMESTAMP}_세대별 인기관광지(10대).csv`]: csvForAudience(
          "ALL",
          0,
        ),
      },
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /unexpected ranking csv file/i,
    );
  });

  it("rejects the old dashboard CSV header", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: files.ALL.replace(CSV_HEADER, OLD_DASHBOARD_CSV_HEADER),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /invalid csv header/i,
    );
  });

  it("rejects a missing audience file", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => {
        const { TWENTIES: _missing, ...rest } = files;
        return rest;
      },
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /missing required audience file/i,
    );
  });

  it("rejects a duplicate rank inside an audience file", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 2, (columns) => {
          columns[0] = "1";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /duplicate rank/i,
    );
  });

  it("rejects a rank token with trailing characters", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 1, (columns) => {
          columns[0] = "1x";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /invalid rank/i,
    );
  });

  it("rejects a fractional rank token", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 1, (columns) => {
          columns[0] = "1.5";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /invalid rank/i,
    );
  });

  it("rejects a rank token with surrounding whitespace", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 1, (columns) => {
          columns[0] = " 1 ";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /invalid rank/i,
    );
  });

  it("rejects rank values that are out of physical row order", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(
          replaceLine(files.ALL, 1, (columns) => {
            columns[0] = "2";
            return columns;
          }),
          2,
          (columns) => {
            columns[0] = "1";
            return columns;
          },
        ),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /invalid rank order/i,
    );
  });

  it("rejects a non-hex source place id without echoing row contents", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 1, (columns) => {
          columns[1] = "not-a-hex-id";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /invalid source place id/i,
    );
    await expect(parsePlaceRankingDirectory(directory)).rejects.not.toThrow(
      /not-a-hex-id|에버랜드/,
    );
  });

  it("rejects a wrong numeric row audience value", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        TWENTIES: replaceLine(files.TWENTIES, 1, (columns) => {
          columns[4] = "30";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /audience mismatch/i,
    );
  });

  it("rejects a blank place name", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 1, (columns) => {
          columns[2] = " ";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /blank place name/i,
    );
  });

  it("rejects a nonnumeric share ratio", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 1, (columns) => {
          columns[5] = "nine";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /invalid share percent/i,
    );
  });

  it("rejects a share ratio with more than two fractional digits", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 1, (columns) => {
          columns[5] = "9.999";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /invalid share percent/i,
    );
  });

  it("rejects a sub-hundredth share ratio", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 30, (columns) => {
          columns[5] = "0.001";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /invalid share percent/i,
    );
  });

  it("rejects an increasing share ratio", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 2, (columns) => {
          columns[5] = "9.5";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /share percent order/i,
    );
  });

  it("rejects a duplicate source place id inside an audience file", async () => {
    const { directory, root } = await withRankingDirectory({
      mutate: (files) => ({
        ...files,
        ALL: replaceLine(files.ALL, 2, (columns) => {
          columns[1] = "0001aaaaaaaaaaaaaaaaaaaaaaaaaaaa";
          return columns;
        }),
      }),
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /duplicate source place id/i,
    );
  });

  it("rejects a malformed directory period", async () => {
    const { directory, root } = await withRankingDirectory({
      period: "202607-202508",
    });
    roots.push(root);

    await expect(parsePlaceRankingDirectory(directory)).rejects.toThrow(
      /invalid directory period/i,
    );
  });
});
