const path = require('node:path');
const release = process.env.HAETTEUM_RELEASE;
if (!release || !path.isAbsolute(release)) throw new Error('HAETTEUM_RELEASE must be an absolute versioned release path');
const shared = process.env.HAETTEUM_SHARED || '/home/ubuntu/haetteum-shared';
const interpreter = process.env.NODE_BIN || '/usr/bin/node';
module.exports = { apps: [
  { name: 'haetteum-web', cwd: path.join(release, 'web/apps/web'), script: path.join(release, 'web/apps/web/server.js'), interpreter,
    node_args: [`--env-file=${path.join(shared, 'web.env')}`], env: { NODE_ENV: 'production', PORT: '3000', HOSTNAME: '0.0.0.0' },
    out_file: path.join(shared, 'logs/web-out.log'), error_file: path.join(shared, 'logs/web-error.log'), autorestart: true, max_memory_restart: '512M', time: true },
  { name: 'haetteum-api', cwd: path.join(release, 'api'), script: path.join(release, 'api/dist/main.js'), interpreter,
    node_args: [`--env-file=${path.join(shared, 'api.env')}`], env: { NODE_ENV: 'production', API_PORT: '4000', PORT: '4000' },
    out_file: path.join(shared, 'logs/api-out.log'), error_file: path.join(shared, 'logs/api-error.log'), autorestart: true, max_memory_restart: '512M', time: true },
] };
