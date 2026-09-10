#!/usr/bin/env bash
set -Eeuo pipefail
api=${1:-http://127.0.0.1:4000}
web=${2:-http://127.0.0.1:3000}
get() { curl --fail --silent --show-error --connect-timeout 3 --max-time 15 --retry 8 --retry-delay 2 --retry-connrefused "$1"; }
get "$api/api/v1/health" >/dev/null
page=$(mktemp); trap 'rm -f "$page"' EXIT
for route in / /explore /login; do
  get "$web$route" >"$page"
  # Fetch a real script and stylesheet referenced by each rendered route.
  python3 - "$page" <<'PY' | while IFS= read -r asset; do get "$web$asset" >/dev/null; done
import html, re, sys
s = open(sys.argv[1]).read()
for ext in ('js', 'css'):
    assets = re.findall(r'(?:src|href)="([^" ]+\.' + ext + r'(?:\?[^" ]*)?)"', s)
    assets = [html.unescape(a) for a in assets if a.startswith('/_next/')]
    if not assets: raise SystemExit('Missing rendered ' + ext + ' asset')
    print(assets[0])
PY
done
