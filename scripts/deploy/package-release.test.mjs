import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('./package-release.sh', import.meta.url).pathname;
for (const hazard of ['.env.production', 'private.pem', 'external-link', 'broken-link']) {
  test(`artifact rejects ${hazard}`, () => {
    const root = mkdtempSync(join(tmpdir(), 'release-validation-'));
    try {
      if (hazard === 'external-link') symlinkSync('/etc/hosts', join(root, hazard));
      else if (hazard === 'broken-link') symlinkSync('missing', join(root, hazard));
      else writeFileSync(join(root, hazard), 'secret');
      const result = spawnSync('bash', [script, '--verify', root], { encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Forbidden artifact|Escaping artifact|Broken artifact/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}
test('artifact accepts internal relative symlink', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-validation-'));
  try {
    mkdirSync(join(root, 'modules'));
    writeFileSync(join(root, 'modules', 'runtime.js'), 'ok');
    symlinkSync('modules/runtime.js', join(root, 'runtime.js'));
    const result = spawnSync('bash', [script, '--verify', root], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
