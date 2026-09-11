#!/usr/bin/env bash
set -euo pipefail
web=${1:-http://127.0.0.1:3000}
headers=$(mktemp)
trap 'rm -f "$headers"' EXIT
# A saved-course ID absent from build-time samples must reach the auth gate.
route=/courses/00000000-0000-4000-8000-000000000000/edit
curl --silent --show-error --connect-timeout 3 --max-time 20 -D "$headers" -o /dev/null "$web$route"
# Inspect headers rather than following redirects and hiding a broken auth gate.
python3 - "$headers" <<'PY'
import pathlib, sys
headers = pathlib.Path(sys.argv[1]).read_text().splitlines()
assert any(line.startswith(('HTTP/1.1 307', 'HTTP/2 307')) for line in headers), headers
location = next((line.split(':', 1)[1].strip() for line in headers if line.lower().startswith('location:')), '')
assert location == '/login?returnTo=%2Fcourses%2F00000000-0000-4000-8000-000000000000%2Fedit', location
PY
