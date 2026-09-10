const fs = require('node:fs');
const path = require('node:path');
const release = process.argv[2];
const processes = JSON.parse(fs.readFileSync(0, 'utf8'));
for (const [name, cwd, script] of [['haetteum-web', 'web/apps/web', 'web/apps/web/server.js'], ['haetteum-api', 'api', 'api/dist/main.js']]) {
  const proc = processes.find(p => p.name === name)?.pm2_env;
  if (!proc || proc.status !== 'online' || proc.pm_cwd !== path.join(release, cwd) || proc.pm_exec_path !== path.join(release, script)) {
    console.error(`PM2 release verification failed: ${name}`); process.exit(1);
  }
}
