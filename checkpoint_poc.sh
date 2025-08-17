#!/usr/bin/env bash
set -euo pipefail

# Config
REMOTE="${1:-origin}"
BR_PREFIX="checkpoint/lesson-planning"
TAG_PREFIX="poc-snapshot"
TS="$(date +%Y%m%d-%H%M%S)"

# Sanity
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "❌ Not a git repo."; exit 1; }
CURR_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
NEW_BRANCH="${BR_PREFIX}-${TS}"
NEW_TAG="${TAG_PREFIX}-${TS}"

echo "▶ Current branch: ${CURR_BRANCH}"
echo "▶ Creating backup branch: ${NEW_BRANCH}"

# Ensure latest refs
git fetch "${REMOTE}" --prune

# Create branch from current HEAD
git checkout -b "${NEW_BRANCH}"

# Stage everything, including new files (but not ignored)
git add -A

# Show a short status summary
echo "▶ Pending changes:"
git status --short

# Commit (allow empty in case nothing changed; still want branch/tag to exist)
git commit --allow-empty -m "Checkpoint: Lesson Planning TIL + mode selector + selected-LO payload (${TS})"

# Tag it
git tag -a "${NEW_TAG}" -m "POC snapshot ${TS} (branch: ${NEW_BRANCH})"

# Push branch and tag
echo "▶ Pushing branch and tag to ${REMOTE}…"
git push "${REMOTE}" "${NEW_BRANCH}"
git push "${REMOTE}" "${NEW_TAG}"

# Extra: local backup archive (exclude node_modules/.git)
ARCHIVE="poc-backup-${TS}.zip"
echo "▶ Creating local archive ${ARCHIVE} (excluding node_modules, .git)…"
zip -r "${ARCHIVE}" . -x "node_modules/*" -x ".git/*" >/dev/null

echo "✅ Checkpoint complete."
echo "   Branch: ${NEW_BRANCH}"
echo "   Tag:    ${NEW_TAG}"
echo "   Archive: ${ARCHIVE}"
echo
echo "🔄 To roll back later:"
echo "  git checkout ${NEW_BRANCH}   # or: git checkout ${NEW_TAG}"

