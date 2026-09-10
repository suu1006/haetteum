#!/usr/bin/env bash
set -euo pipefail

verify_tree() {
  node --input-type=module - "$1" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const root = fs.realpathSync(process.argv[2]);
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (/^\.env(?:\.|$)/.test(entry.name) || /\.(pem|key|p12|pfx)$/i.test(entry.name) || entry.name === '.git') {
      throw new Error(`Forbidden artifact: ${path.relative(root, file)}`);
    }
    if (entry.isSymbolicLink()) {
      let resolved;
      try { resolved = fs.realpathSync(file); }
      catch { throw new Error(`Broken artifact symlink: ${file}`); }
      if (path.isAbsolute(fs.readlinkSync(file)) || !resolved.startsWith(root + path.sep)) {
        throw new Error(`Escaping artifact symlink: ${file}`);
      }
    } else if (entry.isDirectory()) visit(file);
  }
}
visit(root);
NODE
}
if [[ ${1:-} == --verify ]]; then verify_tree "${2:?artifact directory required}"; exit; fi

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || { echo 'Package on Linux x64 CI only' >&2; exit 1; }
[[ $(node --version) == v24.19.0 && $(pnpm --version) == 10.33.0 ]] || { echo 'Node 24.19.0 and pnpm 10.33.0 required' >&2; exit 1; }
SHA=${GITHUB_SHA:?GITHUB_SHA is required}
[[ $SHA =~ ^[0-9a-f]{40}$ && $SHA == "$(git rev-parse HEAD)" ]] || { echo 'SHA does not match checkout' >&2; exit 1; }
OUTPUT=${1:-"$ROOT/artifacts"}
mkdir -p "$OUTPUT"
OUTPUT=$(cd "$OUTPUT" && pwd)
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
RELEASE="$STAGE/release"
mkdir -p "$RELEASE/web"

# pnpm's pack rules can omit ignored build output; explicitly add built files below.
pnpm --filter @haetteum/api deploy --legacy --prod "$RELEASE/api"
mkdir -p "$RELEASE/api/dist"
cp -a apps/api/dist/. "$RELEASE/api/dist/"
mkdir -p "$RELEASE/api/prisma"
cp -a apps/api/prisma/. "$RELEASE/api/prisma/"
cp apps/api/prisma.config.ts "$RELEASE/api/"
CONTRACTS=$(realpath "$RELEASE/api/node_modules/@haetteum/contracts")
[[ $CONTRACTS == "$RELEASE/api/"* ]] || { echo 'Contracts escaped isolated deployment' >&2; exit 1; }
mkdir -p "$CONTRACTS/dist"
cp -a packages/contracts/dist/. "$CONTRACTS/dist/"
# Explicitly remove template env files, never silently discard real credentials.
find "$RELEASE/api" -name .env.example -type f -delete

cp -a apps/web/.next/standalone/. "$RELEASE/web/"
mkdir -p "$RELEASE/web/apps/web/.next"
cp -a apps/web/.next/static "$RELEASE/web/apps/web/.next/"
cp -a apps/web/public "$RELEASE/web/apps/web/"
# Contracts may be bundled by Next, but retain the workspace build for traced imports.
mkdir -p "$RELEASE/web/packages/contracts"
cp packages/contracts/package.json "$RELEASE/web/packages/contracts/"
cp -a packages/contracts/dist "$RELEASE/web/packages/contracts/"
cp ecosystem.config.js "$RELEASE/"
mkdir -p "$RELEASE/scripts/deploy"
cp scripts/deploy/*.sh scripts/deploy/validate-archive.py scripts/deploy/backup-db.cjs scripts/deploy/verify-pm2.cjs "$RELEASE/scripts/deploy/"

for file in web/apps/web/server.js web/apps/web/.next/BUILD_ID api/dist/main.js api/dist/generated/prisma/client.js api/node_modules/prisma/build/index.js api/prisma/schema.prisma; do
  [[ -s "$RELEASE/$file" ]] || { echo "Missing artifact: $file" >&2; exit 1; }
done
[[ -d "$RELEASE/api/prisma/migrations" ]]
[[ -n $(find "$RELEASE/web/apps/web/.next/static" -type f -name '*.js' -print -quit) ]]
[[ -n $(find "$RELEASE/web/apps/web/.next/static" -type f -name '*.css' -print -quit) ]]
verify_tree "$RELEASE"

# Validate the traced monorepo root and deployment identifier from this build.
node --input-type=module - "$ROOT" "$SHA" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const [root, sha] = process.argv.slice(2);
const { config } = JSON.parse(fs.readFileSync('apps/web/.next/required-server-files.json'));
if (fs.realpathSync(config.outputFileTracingRoot) !== fs.realpathSync(root) || config.deploymentId !== sha) {
  throw new Error('Next build tracing root/deploymentId mismatch');
}
NODE
(
  cd "$RELEASE/api"
  node --input-type=module -e 'import bcrypt from "bcrypt"; import "@haetteum/contracts"; import "./dist/generated/prisma/client.js"; if (!bcrypt.compareSync("probe", bcrypt.hashSync("probe", 4))) throw new Error("bcrypt failed")'
  node node_modules/prisma/build/index.js --version
)
(
  cd "$RELEASE/web/apps/web"
  node -e 'const {createRequire}=require("node:module"); const r=createRequire(require.resolve("next/package.json")); r("sharp")({create:{width:1,height:1,channels:3,background:"white"}}).png().toBuffer().then(()=>console.log("sharp native OK"))'
)
node --input-type=module - "$RELEASE" "$SHA" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const [root, sha] = process.argv.slice(2);
fs.writeFileSync(path.join(root, 'release.json'), JSON.stringify({ sha, node: process.version, platform: process.platform, arch: process.arch, createdAt: new Date().toISOString() }, null, 2) + '\n');
NODE
ARCHIVE="release-$SHA.tar.gz"
[[ ! -e "$OUTPUT/$ARCHIVE" ]] || { echo 'Refusing to overwrite existing artifact' >&2; exit 1; }
tar -C "$RELEASE" -czf "$OUTPUT/$ARCHIVE" .
(cd "$OUTPUT" && sha256sum "$ARCHIVE" > "$ARCHIVE.sha256")
du -sb "$RELEASE"
stat -c '%s %n' "$OUTPUT/$ARCHIVE"
echo "$OUTPUT/$ARCHIVE"
