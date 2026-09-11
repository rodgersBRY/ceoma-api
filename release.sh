#!/usr/bin/env bash
# Merges develop into main, tags the release, and pushes both — the push to
# main is what triggers ci.yml's docker job to build and publish the image
# to GHCR. See docs/superpowers/specs/2026-09-09-ghcr-docker-publish-design.md.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

info()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
error() { printf '\033[1;31mERROR:\033[0m %s\n' "$1" >&2; }

# Formats piped commit descriptions ("seed x grades") as capitalized bullets.
format_entries() { awk '{ if (NF) print "- " toupper(substr($0,1,1)) substr($0,2) }'; }

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

# ── Changelog ─────────────────────────────────────────────────────────────

info "updating CHANGELOG.md"

previous_tag="$(git describe --tags --abbrev=0 2>/dev/null || true)"
if [[ -n "$previous_tag" ]]; then
  changelog_range="${previous_tag}..HEAD"
else
  changelog_range="HEAD"
fi

raw_subjects="$(git log "$changelog_range" --no-merges --pretty=format:'%s')"

added="$(echo "$raw_subjects" | grep -E '^FEAT: ' | sed -E 's/^FEAT: //' | format_entries || true)"
fixed="$(echo "$raw_subjects" | grep -E '^FIX: ' | sed -E 's/^FIX: //' | format_entries || true)"
security="$(echo "$raw_subjects" | grep -E '^SECURITY: ' | sed -E 's/^SECURITY: //' | format_entries || true)"

changelog_entries=""
[[ -n "$added" ]] && changelog_entries+="### Added"$'\n\n'"$added"$'\n\n'
[[ -n "$fixed" ]] && changelog_entries+="### Fixed"$'\n\n'"$fixed"$'\n\n'
[[ -n "$security" ]] && changelog_entries+="### Security"$'\n\n'"$security"$'\n\n'
if [[ -z "$changelog_entries" ]]; then
  changelog_entries="_No user-facing changes._"
fi

changelog_body=""
if [[ -f CHANGELOG.md ]]; then
  changelog_body="$(tail -n +2 CHANGELOG.md)"
fi

{
  echo "# Changelog"
  echo
  echo "## ${tag} - $(date +%Y-%m-%d)"
  echo
  echo "$changelog_entries"
  echo
  echo "$changelog_body"
} > CHANGELOG.md.tmp
mv CHANGELOG.md.tmp CHANGELOG.md

git add CHANGELOG.md
git commit -m "DOCS: update changelog for release ${tag}"

info "creating annotated tag $tag"
git tag -a "$tag" -m "Release $tag"

# ── Push ──────────────────────────────────────────────────────────────────

info "pushing main"
git push origin main
info "pushing tag $tag"
git push origin "$tag"

info "done. CI will build and publish:"
echo "  ghcr.io/rodgersbry/kahawatrade-api:latest"
echo "  ghcr.io/rodgersbry/kahawatrade-api:$(git rev-parse --short HEAD)"

info "switching back to develop"
git checkout develop
