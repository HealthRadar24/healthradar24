#!/usr/bin/env bash
set -euo pipefail

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing to sync with a dirty worktree." >&2
  exit 1
fi

if [[ "$(git remote get-url origin)" != "https://github.com/HealthRadar24/healthradar24.git" ]]; then
  echo "origin must point to HealthRadar24/healthradar24." >&2
  exit 1
fi

if [[ "$(git remote get-url upstream)" != "https://github.com/koala73/worldmonitor.git" ]]; then
  echo "upstream must point to koala73/worldmonitor." >&2
  exit 1
fi

branch="sync/upstream-$(date -u +%F)"
git fetch upstream main
git switch main
git pull --ff-only origin main
git switch -c "$branch"
git merge --no-ff upstream/main

cat <<EOF
Upstream merge is staged on $branch.
Resolve conflicts in favor of HealthRadar24 branding and infrastructure, then run:
  npm run security:brand-isolation
  npm run typecheck:all
  npm run test:data
EOF
