#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (used until the Actions workflow can be enabled).
set -euo pipefail
cd "$(dirname "$0")/.."
[ "$(gh api user -q .login)" = "ragnarokllc1981-cpu" ] || { echo "gh must be ragnarokllc1981-cpu"; exit 1; }
BASE_PATH=${BASE_PATH:-/hoffmans-home-services/} npm run build
rm -rf /tmp/hhs-pages && cp -r dist /tmp/hhs-pages
git -C /tmp/hhs-pages init -q -b gh-pages
git -C /tmp/hhs-pages -c user.name=ragnarokllc1981-cpu -c user.email=ragnarokllc1981@gmail.com add -A
git -C /tmp/hhs-pages -c user.name=ragnarokllc1981-cpu -c user.email=ragnarokllc1981@gmail.com commit -qm "Deploy $(git rev-parse --short HEAD)"
git -C /tmp/hhs-pages -c credential.helper= -c "credential.helper=!$(command -v gh) auth git-credential" push -qf https://github.com/ragnarokllc1981-cpu/hoffmans-home-services.git gh-pages
echo deployed
