#!/usr/bin/env bash
source "$(dirname "$0")/release-common.sh"
previous=${1:?Usage: prune-release.sh PREVIOUS_RELEASE}
lock_release
current=$(readlink -f "$HAETTEUM_CURRENT")
[[ -f $HAETTEUM_SHARED/verified/$(basename "$current") ]] || fail 'Current release is not verified'
python3 "$DEPLOY_DIR/prune-artifacts.py" "$HAETTEUM_RELEASES" "$HAETTEUM_SHARED" "$current" "$previous"
