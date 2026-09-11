const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const output = process.argv[2];
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const url = new URL(process.env.DATABASE_URL);
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)) };
if (url.searchParams.has('sslmode')) env.PGSSLMODE = url.searchParams.get('sslmode');
process.umask(0o077);
const partial = `${output}.partial`;
try {
  for (const [cmd, args] of [['pg_dump', ['--format=custom', '--file', partial]], ['pg_restore', ['--list', partial]]]) {
    const result = spawnSync(cmd, args, { env, stdio: ['ignore', 'ignore', 'pipe'] });
    if (result.error || result.status !== 0) throw new Error(`${cmd} failed; backup not verified`);
  }
  if (fs.statSync(partial).size === 0) throw new Error('Empty database backup');
  fs.renameSync(partial, output);
} catch (error) {
  fs.rmSync(partial, { force: true });
  console.error(error.message);
  process.exitCode = 1;
}
