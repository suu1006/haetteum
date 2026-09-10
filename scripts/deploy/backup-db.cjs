const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const output = process.argv[2];
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const url = new URL(process.env.DATABASE_URL);
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)) };
if (url.searchParams.has('sslmode')) env.PGSSLMODE = url.searchParams.get('sslmode');
process.umask(0o077);
for (const [cmd, args] of [['pg_dump', ['--format=custom', '--file', output]], ['pg_restore', ['--list', output]]]) {
  const result = spawnSync(cmd, args, { env, stdio: ['ignore', 'ignore', 'pipe'] });
  if (result.error || result.status !== 0) { console.error(`${cmd} failed; backup not verified`); process.exit(1); }
}
if (fs.statSync(output).size === 0) throw new Error('Empty database backup');
