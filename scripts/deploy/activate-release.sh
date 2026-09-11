#!/usr/bin/env bash
source "$(dirname "$0")/release-common.sh"
archive=${1:?Usage: activate-release.sh ARCHIVE SHA [--stage-only|--verify-only]}
sha=${2:?SHA required}; mode=${3:-activate}
valid_sha "$sha"
[[ $mode = activate || $mode = --stage-only || $mode = --verify-only ]] || fail 'Invalid mode'
[[ -f $archive && -f $archive.sha256 ]] || fail 'Archive/checksum missing'
archive=$(cd "$(dirname "$archive")" && pwd)/$(basename "$archive")
# Only consume the checksum, never paths supplied inside the checksum sidecar.
expected=$(awk 'NR==1 {print $1}' "$archive.sha256")
[[ $expected =~ ^[a-f0-9]{64}$ ]] || fail 'Invalid checksum format'
actual=$(sha256sum "$archive" | awk '{print $1}')
[[ $actual = "$expected" ]] || fail 'Checksum mismatch'
lock_release
mkdir -p "$HAETTEUM_RELEASES"
release=$HAETTEUM_RELEASES/$sha
# Validate paths, link targets, file types and unpacked size before extraction.
bytes=$(python3 "$DEPLOY_DIR/validate-archive.py" "$archive")
reserve=${BACKUP_REQUIRED_BYTES:-0}
[[ $reserve =~ ^[0-9]+$ ]] || fail 'Invalid backup reserve'
free=$(df -Pk "$HAETTEUM_RELEASES" | awk 'END {print $4 * 1024}')
unpack_bytes=$bytes
[[ ! -e $release ]] || unpack_bytes=0
required=$((unpack_bytes + reserve + 536870912))
printf 'Disk bytes: available=%s unpack=%s backup=%s headroom=536870912 required=%s (archive already uploaded)\n' "$free" "$unpack_bytes" "$reserve" "$required"
[[ $(awk -v f="$free" -v r="$required" 'BEGIN {print (f >= r)}') = 1 ]] || fail "Insufficient space: need $required bytes free for unpacking, backup and headroom"
check_shared
previous_current=$(readlink -f "$HAETTEUM_CURRENT" || true)
created_release=false; rollback_failed=false
staging=''; api_pid=''; web_pid=''; switched=false; rollback=''
cleanup() {
  rc=$?
  trap - EXIT INT TERM
  for pid in "$api_pid" "$web_pid"; do if [[ -n $pid ]]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi; done
  [[ -z $staging ]] || rm -rf -- "$staging"
  if [[ $rc != 0 && $switched = true ]]; then
    echo 'Activation failed; restoring verified application release (database unchanged)' >&2
    if start_release "$rollback" && link_current "$rollback" && "$DEPLOY_DIR/smoke-release.sh"; then
      "$PM2_BIN" save || true
    else
      rollback_failed=true
      echo 'CRITICAL: rollback verification failed; operator intervention required' >&2
    fi
  fi
  if [[ $rc != 0 && $created_release = true && $rollback_failed = false && $(readlink -f "$HAETTEUM_CURRENT" || true) != "$release" ]]; then
    rm -rf -- "$release"
    rm -f -- "$HAETTEUM_SHARED/verified/$sha"
  fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if [[ -e $release ]]; then
  [[ -f $release/.artifact-sha256 && $(cat "$release/.artifact-sha256") = "$expected" ]] || fail 'Immutable release already exists with different artifact'
else
  staging=$(mktemp -d "$HAETTEUM_RELEASES/.staging-$sha.XXXXXX")
  tar -xzf "$archive" --no-same-owner -C "$staging"
  python3 - "$staging" <<'PYTHON'
import pathlib, sys
root = pathlib.Path(sys.argv[1]).resolve()
for entry in root.rglob('*'):
    if entry.is_symlink():
        target = entry.resolve(strict=True)
        if not target.is_relative_to(root): raise SystemExit('Escaping extracted symlink')
PYTHON
  verify_release "$staging"
  "$NODE_BIN" -e 'const m=require(process.argv[1]); if((m.sha || m.commit || m.commitSha)!==process.argv[2]) process.exit(1)' "$staging/release.json" "$sha" || fail 'Release manifest SHA mismatch'
  [[ ! -e $staging/api/uploads && ! -e $staging/api/.env.production ]] || fail 'Artifact contains shared runtime state'
  ln -s "$HAETTEUM_SHARED/uploads" "$staging/api/uploads"
  ln -s "$HAETTEUM_SHARED/api.env" "$staging/api/.env.production"
  printf '%s\n' "$expected" >"$staging/.artifact-sha256"
  mv "$staging" "$release"; staging=''; created_release=true
fi
verify_release "$release"
[[ $mode != --stage-only ]] || exit 0
if [[ $mode = activate ]]; then
  if [[ -n ${ROLLBACK_SHA:-} ]]; then valid_sha "$ROLLBACK_SHA"; rollback=$HAETTEUM_RELEASES/$ROLLBACK_SHA
  elif [[ -L $HAETTEUM_CURRENT ]]; then rollback=$(readlink -f "$HAETTEUM_CURRENT"); fi
  [[ -n $rollback && $rollback = "$HAETTEUM_RELEASES/"* && -f $HAETTEUM_SHARED/verified/$(basename "$rollback") ]] || fail 'A verified rollback release is required, including first recovery'
  verify_release "$rollback"
  [[ ${MIGRATIONS_BACKWARD_COMPATIBLE:-false} = true ]] || fail 'Review migrations and set MIGRATIONS_BACKWARD_COMPATIBLE=true'
  [[ $reserve -gt 0 ]] || fail 'Set BACKUP_REQUIRED_BYTES from database size plus backup margin'
  # Do not pass DATABASE_URL in shell logs or command-line arguments.
  backup=$HAETTEUM_SHARED/backups/$(date -u +%Y%m%dT%H%M%SZ)-$sha.dump
  (cd "$release/api"; "$NODE_BIN" --env-file="$HAETTEUM_SHARED/api.env" "$DEPLOY_DIR/backup-db.cjs" "$backup")
  # Bound verified backups even when later migration/candidate checks fail.
  python3 "$DEPLOY_DIR/prune-artifacts.py" --backups "$HAETTEUM_SHARED"
  (cd "$release/api"; "$NODE_BIN" --env-file="$HAETTEUM_SHARED/api.env" node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma)
fi
python3 - <<'PYTHON'
import socket
sockets = []
for port in (3001, 4001):
    sock = socket.socket(); sock.bind(('0.0.0.0', port)); sockets.append(sock)
PYTHON
(cd "$release/api"; export NODE_ENV=production API_PORT=4001 PORT=4001 TOURISM_SYNC_ENABLED=false PLACE_REELS_ENABLED=false SCHEDULERS_ENABLED=false; exec "$NODE_BIN" --env-file="$HAETTEUM_SHARED/api.env" dist/main.js) >"$HAETTEUM_SHARED/logs/candidate-api.log" 2>&1 & api_pid=$!
(cd "$release/web/apps/web"; export NODE_ENV=production PORT=3001 HOSTNAME=127.0.0.1; exec "$NODE_BIN" --env-file="$HAETTEUM_SHARED/web.env" server.js) >"$HAETTEUM_SHARED/logs/candidate-web.log" 2>&1 & web_pid=$!
"$DEPLOY_DIR/smoke-release.sh" http://127.0.0.1:4001 http://127.0.0.1:3001
kill -0 "$api_pid" "$web_pid" || fail 'Candidate process exited'
kill "$api_pid" "$web_pid"; wait "$api_pid" 2>/dev/null || true; wait "$web_pid" 2>/dev/null || true; api_pid=''; web_pid=''
printf '%s\n' "$expected" >"$HAETTEUM_SHARED/verified/$sha"
[[ $mode != --verify-only ]] || exit 0
switched=true
start_release "$release"
link_current "$release"
"$DEPLOY_DIR/smoke-release.sh"
"$PM2_BIN" save
switched=false
printf 'Activated release %s\n' "$sha"
# Activation is committed; cleanup errors must not roll back healthy production.
protected=()
[[ -z $previous_current ]] || protected+=("$previous_current")
if ! python3 "$DEPLOY_DIR/prune-artifacts.py" "$HAETTEUM_RELEASES" "$HAETTEUM_SHARED" "$release" "$rollback" "${protected[@]}"; then
  echo 'WARNING: artifact cleanup failed; deployment is healthy, inspect disk usage' >&2
fi
rm -f -- "$archive" "$archive.sha256"
