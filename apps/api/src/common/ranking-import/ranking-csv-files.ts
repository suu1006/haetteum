import { readdir } from "node:fs/promises";

export interface RankingCsvFileEntry {
  actualFileName: string;
  sourceFileName: string;
}

export interface AudienceCsvFileConfig {
  barePattern: RegExp;
  timestampedPattern: RegExp;
  audienceLabels: readonly string[];
  fileNameForLabel: (timestamp: string, label: string) => string;
}

export async function readAudienceCsvFiles(
  directory: string,
  expectedTimestamp: string,
  config: AudienceCsvFileConfig,
): Promise<Map<string, RankingCsvFileEntry>> {
  const directoryEntries = await readdir(directory);
  const normalizedFiles = new Map<string, RankingCsvFileEntry>();
  const seenAudienceLabels = new Set<string>();

  for (const entry of directoryEntries) {
    const normalized = entry.normalize("NFC");

    if (!normalized.endsWith(".csv")) {
      continue;
    }

    if (normalizedFiles.has(normalized)) {
      throw new Error(`Duplicate normalized file name: ${normalized}`);
    }

    if (config.barePattern.test(normalized)) {
      throw new Error(
        `Invalid timestamp prefix in audience file name: ${normalized}`,
      );
    }

    const match = config.timestampedPattern.exec(normalized);

    if (match === null) {
      throw new Error(`Unexpected ranking CSV file: ${normalized}`);
    }

    const [, fileTimestamp, audienceLabel] = match;

    if (fileTimestamp !== expectedTimestamp) {
      throw new Error(
        `Invalid timestamp prefix in audience file name: ${normalized}`,
      );
    }

    if (
      audienceLabel === undefined ||
      !config.audienceLabels.includes(audienceLabel)
    ) {
      throw new Error(`Unexpected ranking CSV file: ${normalized}`);
    }

    const expectedFileName = config.fileNameForLabel(
      expectedTimestamp,
      audienceLabel,
    );

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

export function assertCsvHeader(
  header: string[] | undefined,
  expectedHeader: readonly string[],
  sourceFileName: string,
): void {
  if (
    header === undefined ||
    header.length !== expectedHeader.length ||
    header.some((column, index) => column !== expectedHeader[index])
  ) {
    throw new Error(`Invalid CSV header in ${sourceFileName}`);
  }
}
