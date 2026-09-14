export interface RankingRowContext {
  sourceFileName: string;
  rowNumber: number;
}

const RANK_PATTERN = /^\d+$/u;
const PERCENT_PATTERN = /^\d+(?:\.\d{1,2})?$/u;

export function assertColumnCount(
  columns: string[],
  expectedLength: number,
  ctx: RankingRowContext,
): void {
  if (columns.length !== expectedLength) {
    throw new Error(
      `Invalid column count in ${ctx.sourceFileName} at row ${ctx.rowNumber}`,
    );
  }
}

export function assertRank(
  rankToken: string,
  rowsPerAudience: number,
  ctx: RankingRowContext,
): number {
  const rank = Number.parseInt(rankToken, 10);

  if (
    !RANK_PATTERN.test(rankToken) ||
    !Number.isInteger(rank) ||
    rank < 1 ||
    rank > rowsPerAudience
  ) {
    throw new Error(
      `Invalid rank in ${ctx.sourceFileName} at row ${ctx.rowNumber}`,
    );
  }

  return rank;
}

export function assertPattern(
  value: string | undefined,
  pattern: RegExp,
  fieldLabel: string,
  ctx: RankingRowContext,
): string {
  if (value === undefined || !pattern.test(value)) {
    throw new Error(
      `Invalid ${fieldLabel} in ${ctx.sourceFileName} at row ${ctx.rowNumber}`,
    );
  }

  return value;
}

export function assertAudienceLabel(
  value: string | undefined,
  expectedLabel: string,
  ctx: RankingRowContext,
): string {
  if (value !== expectedLabel) {
    throw new Error(
      `Audience mismatch in ${ctx.sourceFileName} at row ${ctx.rowNumber}`,
    );
  }

  return value;
}

export function assertNonBlank(
  value: string | undefined,
  fieldLabel: string,
  ctx: RankingRowContext,
): string {
  if (value === undefined || value.length === 0) {
    throw new Error(
      `Blank ${fieldLabel} in ${ctx.sourceFileName} at row ${ctx.rowNumber}`,
    );
  }

  return value;
}

export function assertPercent(
  value: string | undefined,
  fieldLabel: string,
  max: number,
  ctx: RankingRowContext,
): string {
  if (
    value === undefined ||
    !PERCENT_PATTERN.test(value) ||
    Number.parseFloat(value) <= 0 ||
    Number.parseFloat(value) > max
  ) {
    throw new Error(
      `Invalid ${fieldLabel} in ${ctx.sourceFileName} at row ${ctx.rowNumber}`,
    );
  }

  return value;
}

interface AudienceRow {
  rank: number;
  sourcePlaceId: string;
}

/**
 * 한 오디언스 CSV 안에서 rank/장소ID 중복, rank 순서, 퍼센트 내림차순 정렬을
 * 행 단위로 누적 검증한다. place-rankings와 hot-place-rankings가 동일한
 * 규칙을 공유하되 퍼센트 필드 이름(비율/성장율)만 다르다.
 */
export class AudienceRowOrderValidator<TRow extends AudienceRow> {
  private readonly seenRanks = new Set<number>();
  private readonly seenSourcePlaceIds = new Set<string>();
  private previousPercent: number | undefined;

  constructor(
    private readonly sourceFileName: string,
    private readonly rowsPerAudience: number,
    private readonly percentFieldLabel: string,
    private readonly percentOf: (row: TRow) => string,
  ) {}

  check(row: TRow, index: number, rowNumber: number): void {
    const normalizedSourcePlaceId = row.sourcePlaceId.toLowerCase();

    if (this.seenRanks.has(row.rank)) {
      throw new Error(
        `Duplicate rank in ${this.sourceFileName} at row ${rowNumber}`,
      );
    }

    if (row.rank !== index + 1) {
      throw new Error(
        `Invalid rank order in ${this.sourceFileName} at row ${rowNumber}`,
      );
    }

    if (this.seenSourcePlaceIds.has(normalizedSourcePlaceId)) {
      throw new Error(
        `Duplicate source place id in ${this.sourceFileName} at row ${rowNumber}`,
      );
    }

    const percent = Number.parseFloat(this.percentOf(row));

    if (this.previousPercent !== undefined && percent > this.previousPercent) {
      throw new Error(
        `Invalid ${this.percentFieldLabel} order in ${this.sourceFileName} at row ${rowNumber}`,
      );
    }

    this.seenRanks.add(row.rank);
    this.seenSourcePlaceIds.add(normalizedSourcePlaceId);
    this.previousPercent = percent;
  }

  assertNoMissingRanks(): void {
    for (let rank = 1; rank <= this.rowsPerAudience; rank += 1) {
      if (!this.seenRanks.has(rank)) {
        throw new Error(`Missing rank ${rank} in ${this.sourceFileName}`);
      }
    }
  }
}
