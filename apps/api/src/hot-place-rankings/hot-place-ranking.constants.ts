export const DATALAB_SOURCE = "KTO_DATALAB" as const;
export const NATIONAL_SCOPE = "NATIONAL" as const;

export const HOT_PLACE_AUDIENCE_FILE_LABELS = {
  ALL: "전체",
  TWENTIES: "20대",
  THIRTIES: "30대",
  FORTIES: "40대",
  FIFTIES: "50대",
  SIXTIES_PLUS: "60대이상",
} as const;

export const HOT_PLACE_AUDIENCE_ROW_VALUES = {
  ALL: "전체",
  TWENTIES: "20",
  THIRTIES: "30",
  FORTIES: "40",
  FIFTIES: "50",
  SIXTIES_PLUS: "60",
} as const satisfies Record<
  keyof typeof HOT_PLACE_AUDIENCE_FILE_LABELS,
  string
>;

export const HOT_PLACE_ROWS_PER_AUDIENCE = 10;
