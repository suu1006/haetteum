#!/usr/bin/env bash
set -euo pipefail
ROOT=$(realpath "${1:?isolated release root required}")
SOURCE=${2:-current}
API_PID=''
WEB_PID=''
cleanup() { [[ -z $WEB_PID ]] || kill "$WEB_PID" 2>/dev/null || true; [[ -z $API_PID ]] || kill "$API_PID" 2>/dev/null || true; }
trap cleanup EXIT
export NODE_ENV=production SCHEDULERS_ENABLED=false TOURISM_SYNC_ENABLED=false PLACE_REELS_ENABLED=false
(cd "$ROOT/api"; node node_modules/prisma/build/index.js migrate deploy)
(cd "$ROOT/api"; exec node dist/main.js) > "$ROOT/api-smoke.log" 2>&1 & API_PID=$!
(cd "$ROOT/web/apps/web"; PORT=3000 HOSTNAME=127.0.0.1 exec node server.js) > "$ROOT/web-smoke.log" 2>&1 & WEB_PID=$!
for attempt in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:4000/api/v1/health >/dev/null && curl -fsS http://127.0.0.1:3000/login > "$ROOT/login.html"; then break; fi
  if ! kill -0 "$API_PID" || ! kill -0 "$WEB_PID"; then cat "$ROOT/api-smoke.log" "$ROOT/web-smoke.log"; exit 1; fi
  sleep 1
done
curl -fsS http://127.0.0.1:4000/api/v1/health
for route in / /explore /login; do curl -fsS --max-time 20 "http://127.0.0.1:3000$route" > "$ROOT/page.html"; done
if [[ $SOURCE == current ]]; then grep -q '이메일 주소 또는 아이디' "$ROOT/login.html"; fi
node --input-type=module - "$ROOT/login.html" <<'NODE'
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2], 'utf8');
const urls = [...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(m => m[1].replaceAll('&amp;', '&'));
if (!urls.length) throw new Error('No static assets');
for (const url of new Set(urls)) {
 const response = await fetch(new URL(url, 'http://127.0.0.1:3000'));
 if (!response.ok) throw new Error(`Missing asset ${url}: ${response.status}`);
}
NODE
