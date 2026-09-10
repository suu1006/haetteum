#!/usr/bin/env bash
set -Eeuo pipefail
DEPLOY_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
export HAETTEUM_RELEASES=${HAETTEUM_RELEASES:-/home/ubuntu/haetteum-releases}
export HAETTEUM_SHARED=${HAETTEUM_SHARED:-/home/ubuntu/haetteum-shared}
export HAETTEUM_CURRENT=${HAETTEUM_CURRENT:-/home/ubuntu/haetteum-current}
export NODE_BIN=${NODE_BIN:-$(command -v node)}
PM2_BIN=${PM2_BIN:-pm2}
fail() { echo "$*" >&2; exit 1; }
valid_sha() { [[ $1 =~ ^[a-f0-9]{40}$ ]] || fail 'Invalid SHA (expected 40 lowercase hex characters)'; }
lock_release() { mkdir -p "$HAETTEUM_SHARED"; exec 9>"$HAETTEUM_SHARED/deploy.lock"; flock -n 9 || fail 'Deployment already in progress'; }
check_shared() {
  [[ -f $HAETTEUM_SHARED/api.env && -f $HAETTEUM_SHARED/web.env && -d $HAETTEUM_SHARED/uploads ]] || fail 'Shared api.env, web.env and uploads must be provisioned before deployment'
  mkdir -p "$HAETTEUM_SHARED/logs" "$HAETTEUM_SHARED/backups" "$HAETTEUM_SHARED/verified"
  [[ $NODE_BIN = /* && -x $NODE_BIN ]] || fail 'NODE_BIN must be an executable absolute path'
  [[ $("$NODE_BIN" --version) = v24.19.0 ]] || fail 'Node v24.19.0 is required'
}
link_current() { ln -s "$1" "$HAETTEUM_CURRENT.next" && mv -Tf "$HAETTEUM_CURRENT.next" "$HAETTEUM_CURRENT"; }
start_release() {
  export HAETTEUM_RELEASE=$1
  # Explicitly replace the old process definitions, including legacy pnpm wrappers.
  "$PM2_BIN" delete haetteum-web haetteum-api >/dev/null 2>&1 || true
  "$PM2_BIN" start "$1/ecosystem.config.js" --update-env || return 1
  "$PM2_BIN" jlist | "$NODE_BIN" "$DEPLOY_DIR/verify-pm2.cjs" "$1"
}
verify_release() {
  local release=$1
  [[ -f $release/web/apps/web/server.js && -f $release/web/apps/web/.next/BUILD_ID && -d $release/web/apps/web/.next/static && -f $release/api/dist/main.js && -f $release/api/node_modules/prisma/build/index.js && -f $release/api/prisma/schema.prisma && -f $release/release.json ]] || fail 'Incomplete release'
}
