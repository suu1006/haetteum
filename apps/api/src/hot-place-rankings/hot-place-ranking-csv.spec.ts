import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { parseHotPlaceRankingDirectory } from "./hot-place-ranking-csv.js";

const CSV_HEADER =
  "\uFEFF순위,기준년월,시도명,시군구명,관광지ID,관심지점명,구분,연령대,성장율";
const DOWNLOAD_TIMESTAMP = "20260828152434";
const BASE_YEAR_MONTH = "202607";

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
  return mkdtemp(join(tmpdir(), "haetteum-hot-place-ranking-"));
}

function directoryName(period = "202607-202607") {
  return `${DOWNLOAD_TIMESTAMP}_전국_${period}_데이터랩_다운로드`;
}

function sourcePlaceId(audienceIndex: number, rank: number) {
  return `${audienceIndex.toString(16).padStart(2, "0")}${rank
    .toString(16)
    .padStart(2, "0")}${"a".repeat(28)}`;
}

function rankingRows(audience: Audience, audienceIndex: number) {
  const rowAudience = audienceRowValues[audience];

  return Array.from({ length: 10 }, (_, index) => {
    const rank = index + 1;
    const growthPercent = (300 - rank * 10).toFixed(1);

    return [
      rank.toString(),
      BASE_YEAR_MONTH,
      "강원특별자치도",
      "영월군",
      sourcePlaceId(audienceIndex, rank),
      rank === 1 ? "장릉" : `핫플레이스 ${rank}`,
      rank === 1 ? "관광명소" : "레저/스포츠",
      rowAudience,
      rank === 1 ? `${growthPercent}\t` : growthPercent,
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
  const fileName = `세대별 핫플레이스(${audienceFileLabels[audience]}).csv`;
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

function replaceLine(
  csv: string,
  lineIndex: number,
  update: (columns: string[]) => string[],
) {
  const lines = csv.trimEnd().split("\n");
  lines[lineIndex] = update(lines[lineIndex]?.split(",") ?? []).join(",");
  return `${lines.join("\n")}\n`;
}

describe("parseHotPlaceRankingDirectory", () => {
  let roots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
    roots = [];
  });

  it("parses the strict six-file national hot place snapshot", async () => {
    const root = await makeTempRoot();
    roots.push(root);

    const directory = await writeValidDirectory(root);
    const snapshot = await parseHotPlaceRankingDirectory(directory);

    expect(snapshot).toMatchObject({
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      baseYearMonth: "202607",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    });
    expect(snapshot.rows).toHaveLength(60);
    expect(snapshot.rows[0]).toMatchObject({
      audience: "ALL",
      rank: 1,
      baseYearMonth: "202607",
      provinceName: "강원특별자치도",
      districtName: "영월군",
      sourcePlaceName: "장릉",
      sourceCategory: "관광명소",
      growthPercent: "290.0",
      sourceFileName: `${DOWNLOAD_TIMESTAMP}_세대별 핫플레이스(전체).csv`,
    });
  });

  it("keeps growth percentages above 100 without capping", async () => {
    const root = await makeTempRoot();
    roots.push(root);
    const directory = join(root, directoryName());
    await mkdir(directory);
    await Promise.all(
      audiences.map((audience, index) => {
        const csv = replaceLine(
          csvForAudience(audience, index),
          1,
          (columns) => {
            columns[8] = "959.6";
            return columns;
          },
        );
        return writeFile(
          join(directory, fileNameForAudience(audience)),
          csv,
          "utf8",
        );
      }),
    );

    const snapshot = await parseHotPlaceRankingDirectory(directory);
    expect(snapshot.rows[0]?.growthPercent).toBe("959.6");
  });

  it("rejects a file whose row count is not exactly ten", async () => {
    const root = await makeTempRoot();
    roots.push(root);
    const directory = join(root, directoryName());
    await mkdir(directory);
    await Promise.all(
      audiences.map((audience, index) => {
        const csv =
          audience === "ALL"
            ? `${csvForAudience(audience, index).trimEnd()}\n11,${BASE_YEAR_MONTH},강원특별자치도,영월군,${sourcePlaceId(
                index,
                11,
              )},추가,관광명소,전체,5.0\n`
            : csvForAudience(audience, index);
        return writeFile(
          join(directory, fileNameForAudience(audience)),
          csv,
          "utf8",
        );
      }),
    );

    await expect(parseHotPlaceRankingDirectory(directory)).rejects.toThrow(
      /row count/i,
    );
  });

  it("rejects bare filenames without the download timestamp prefix", async () => {
    const root = await makeTempRoot();
    roots.push(root);
    const directory = join(root, directoryName());
    await mkdir(directory);
    await Promise.all(
      audiences.map((audience, index) =>
        writeFile(
          join(directory, fileNameForAudience(audience, null)),
          csvForAudience(audience, index),
          "utf8",
        ),
      ),
    );

    await expect(parseHotPlaceRankingDirectory(directory)).rejects.toThrow(
      /timestamp prefix/i,
    );
  });

  it("rejects an unexpected extra CSV file", async () => {
    const root = await makeTempRoot();
    roots.push(root);
    const directory = await writeValidDirectory(root);
    await writeFile(
      join(directory, `${DOWNLOAD_TIMESTAMP}_세대별 인기관광지(전체).csv`),
      csvForAudience("ALL", 0),
      "utf8",
    );

    await expect(parseHotPlaceRankingDirectory(directory)).rejects.toThrow(
      /Unexpected ranking CSV file/i,
    );
  });

  it("rejects a base year month outside the directory period", async () => {
    const root = await makeTempRoot();
    roots.push(root);
    const directory = join(root, directoryName());
    await mkdir(directory);
    await Promise.all(
      audiences.map((audience, index) => {
        const csv = csvForAudience(audience, index).replaceAll(
          BASE_YEAR_MONTH,
          "202601",
        );
        return writeFile(
          join(directory, fileNameForAudience(audience)),
          csv,
          "utf8",
        );
      }),
    );

    await expect(parseHotPlaceRankingDirectory(directory)).rejects.toThrow(
      /base year month/i,
    );
  });

  it("rejects growth percentages that do not decrease with rank", async () => {
    const root = await makeTempRoot();
    roots.push(root);
    const directory = join(root, directoryName());
    await mkdir(directory);
    await Promise.all(
      audiences.map((audience, index) => {
        const csv = replaceLine(
          csvForAudience(audience, index),
          2,
          (columns) => {
            columns[8] = "9999.0";
            return columns;
          },
        );
        return writeFile(
          join(directory, fileNameForAudience(audience)),
          csv,
          "utf8",
        );
      }),
    );

    await expect(parseHotPlaceRankingDirectory(directory)).rejects.toThrow(
      /growth percent order/i,
    );
  });
});
