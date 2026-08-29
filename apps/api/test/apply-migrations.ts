import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import type { PoolClient } from "pg";

const MIGRATIONS_DIRECTORY = fileURLToPath(
  new URL("../prisma/migrations", import.meta.url),
);

/**
 * 마이그레이션 디렉터리 전체를 이름순(=적용순)으로 읽어 e2e용 임시 스키마에 적용한다.
 * 스펙마다 파일 목록을 손으로 나열하면 새 마이그레이션이 들어올 때마다 빠뜨리게 되고,
 * Prisma 클라이언트만 새 컬럼을 알고 임시 스키마는 모르는 상태로 어긋난다.
 */
export async function applyMigrations(client: PoolClient): Promise<void> {
  const entries = await readdir(MIGRATIONS_DIRECTORY, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  for (const directory of directories) {
    const sql = await readFile(
      join(MIGRATIONS_DIRECTORY, directory, "migration.sql"),
      "utf8",
    );
    await client.query(sql);
  }
}
