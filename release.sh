#!/usr/bin/env bash
# Merges develop into main, tags the release, and pushes both — the push to
# main is what triggers ci.yml's docker job to build and publish the image
# to GHCR. See docs/superpowers/specs/2026-09-09-ghcr-docker-publish-design.md.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

info()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
error() { printf '\033[1;31mERROR:\033[0m %s\n' "$1" >&2; }

# ── Preflight ─────────────────────────────────────────────────────────────

if [[ -n "$(git status --porcelain)" ]]; then
  error "working tree is not clean. Commit, stash, or discard changes first."
  git status --short
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$current_branch" != "develop" ]]; then
  info "currently on '$current_branch', switching to develop"
  git checkout develop
fi

info "fetching origin"
git fetch origin --quiet

local_develop="$(git rev-parse develop)"
remote_develop="$(git rev-parse origin/develop)"
if [[ "$local_develop" != "$remote_develop" ]]; then
  error "local develop does not match origin/develop."
  error "run 'git pull origin develop' (or push local commits) and re-run this script."
  exit 1
fi

# ── Sync main ─────────────────────────────────────────────────────────────

info "checking out main"
git checkout main
info "fast-forwarding main from origin"
git pull --ff-only origin main

# ── Merge develop into main ──────────────────────────────────────────────

info "merging develop into main"
if ! git merge develop --no-edit; then
  error "merge conflict — aborting merge, main left untouched."
  git diff --name-only --diff-filter=U | sed 's/^/  conflict: /' >&2
  git merge --abort
  error "resolve the conflict manually (e.g. checkout main, git merge develop, fix, commit) and re-run this script."
  exit 1
fi

# ── Tag ───────────────────────────────────────────────────────────────────

pkg_version="$(node -p "require('./package.json').version" 2>/dev/null || echo "")"
suggested_tag=""
if [[ -n "$pkg_version" ]]; then
  suggested_tag="v${pkg_version}"
fi

if [[ -n "$suggested_tag" ]]; then
  read -r -p "Tag for this release [$suggested_tag]: " tag_input
  tag="${tag_input:-$suggested_tag}"
else
  read -r -p "Tag for this release (e.g. v1.3.0): " tag
fi

if [[ -z "$tag" ]]; then
  error "no tag provided, aborting before push. main has the merge commit locally — push it manually if you still want the merge, or reset it with 'git reset --hard origin/main'."
  exit 1
fi

if git rev-parse "$tag" >/dev/null 2>&1; then
  error "tag '$tag' already exists. Choose a different version."
  exit 1
fi

info "creating annotated tag $tag"
git tag -a "$tag" -m "Release $tag"

# ── Push ──────────────────────────────────────────────────────────────────

info "pushing main"
git push origin main
info "pushing tag $tag"
git push origin "$tag"

owner_repo="$(git remote get-url origin | sed -E 's#.*[:/]([^/]+/[^/]+)\.git#\1#')"
info "done. CI will build and publish:"
echo "  ghcr.io/${owner_repo}:latest"
echo "  ghcr.io/${owner_repo}:$(git rev-parse --short HEAD)"

info "switching back to develop"
git checkout develop
