import { basename } from "node:path";

const DIRECTORY_PATTERN = /^\d{14}_전국_(\d{6})-(\d{6})_데이터랩_다운로드$/u;

export interface RankingDirectoryPeriod {
  downloadTimestamp: string;
  startMonth: string;
  endMonth: string;
  periodStart: Date;
  periodEnd: Date;
}

export function parseRankingDirectoryPeriod(
  directory: string,
): RankingDirectoryPeriod {
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

function monthStartUtc(yyyymm: string): Date {
  const year = Number.parseInt(yyyymm.slice(0, 4), 10);
  const monthIndex = Number.parseInt(yyyymm.slice(4, 6), 10) - 1;

  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) {
    throw new Error("Invalid directory period: month is out of range");
  }

  return new Date(Date.UTC(year, monthIndex, 1));
}

function monthEndUtc(yyyymm: string): Date {
  const year = Number.parseInt(yyyymm.slice(0, 4), 10);
  const monthIndex = Number.parseInt(yyyymm.slice(4, 6), 10) - 1;

  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) {
    throw new Error("Invalid directory period: month is out of range");
  }

  return new Date(Date.UTC(year, monthIndex + 1, 0));
}
