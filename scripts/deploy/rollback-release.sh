#!/usr/bin/env bash
source "$(dirname "$0")/release-common.sh"
sha=${1:?Usage: rollback-release.sh SHA}
valid_sha "$sha"; lock_release; check_shared
release=$HAETTEUM_RELEASES/$sha
verify_release "$release"
[[ -f $HAETTEUM_SHARED/verified/$sha ]] || fail 'Rollback target has not passed candidate validation'
start_release "$release"
link_current "$release"
"$DEPLOY_DIR/smoke-release.sh"
"$PM2_BIN" save
printf 'Application rollback complete: %s. Database was not reverted.\n' "$sha"
