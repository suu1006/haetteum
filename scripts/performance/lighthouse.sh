#!/usr/bin/env bash
set -euo pipefail
origin="${1:-https://haetteum.kr}"
output_dir="${2:-artifacts/lighthouse/current}"
mkdir -p "$output_dir"
for page in home explore; do
  url="${origin%/}/"
  if [[ "$page" == explore ]]; then url="${origin%/}/explore"; fi
  for run in 1 2 3; do
    npx --yes lighthouse@13.4.1 "$url" --chrome-flags='--headless' --output=html --output=json --output-path="$output_dir/$page-mobile-$run" --quiet
  done
done
npx --yes lighthouse@13.4.1 "${origin%/}/" --preset=desktop --chrome-flags='--headless' --output=html --output=json --output-path="$output_dir/home-desktop" --quiet
