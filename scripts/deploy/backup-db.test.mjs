import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
for (const failure of ['pg_dump', 'pg_restore', 'none']) {
  test(`backup ${failure}: only validated dumps remain`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'backup-test-'));
    try {
      writeFileSync(join(dir, 'pg_dump'), '#!/bin/sh\nprintf data > "$3"\n[ "$FAILURE" != pg_dump ]\n', { mode: 0o755 });
      writeFileSync(join(dir, 'pg_restore'), '#!/bin/sh\n[ "$FAILURE" != pg_restore ]\n', { mode: 0o755 });
      const output = join(dir, 'backup.dump');
      const result = spawnSync(process.execPath, [new URL('./backup-db.cjs', import.meta.url).pathname, output], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, DATABASE_URL: 'postgresql://test:test@localhost/test', FAILURE: failure }, encoding: 'utf8' });
      assert.equal(result.status === 0, failure === 'none', result.stderr);
      assert.equal(existsSync(output), failure === 'none');
      assert.equal(readdirSync(dir).some(name => name.endsWith('.partial')), false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
