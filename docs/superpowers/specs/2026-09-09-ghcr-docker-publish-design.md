# GHCR Docker Image Publish on Merge to Main

## Context

Both `ceoms-api` and `ceoms-web` (`web/`) already have a working `Dockerfile` at their repo root, and both have a GitHub Actions `ci.yml` that runs tests on push to `main` and on every PR. Neither builds nor publishes a Docker image anywhere. The goal is: when `develop` merges into `main`, a Docker image gets built and pushed to GHCR automatically. The existing `push: branches: [main]` trigger already fires on that merge, so no trigger change is needed — only a new job.

## Design

Add one `docker` job to the existing `ci.yml` in each repo (not a new workflow file). The job:

- **Depends on the existing `test` job** (`needs: test`) — a broken build/test run blocks the image from being built or pushed at all.
- **Always builds** the image (on both `pull_request` and `push` events), giving PRs a build-only check that catches a broken `Dockerfile` before merge.
- **Only pushes to GHCR on the `push` event** (i.e. on `main`) — PRs never log in to the registry or push anything.
- **Image reference**: `ghcr.io/${{ github.repository }}` — resolves automatically to `ghcr.io/rodgersBRY/ceoms-api` and `ghcr.io/rodgersBRY/ceoms`, so the same job body is usable unmodified in both repos.
- **Tags**: `latest` (only when on the default branch) and a short git sha, via `docker/metadata-action`.
- **Auth**: the workflow's built-in `GITHUB_TOKEN`, no new secret. Job gets `permissions: packages: write` (and `contents: read`). Login step is gated to the `push` event only.
- **Layer caching**: `type=gha` cache-from/cache-to on `docker/build-push-action`, so repeat builds in this repo's Actions cache are fast.

### Job (identical in both repos)

```yaml
  docker:
    runs-on: ubuntu-latest
    needs: test
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=raw,value=latest,enable={{is_default_branch}}
            type=sha,format=short

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: ${{ github.event_name == 'push' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

This is appended as a second job alongside the existing `test` job in each `ci.yml`; no changes to the existing `test` job or its triggers.

## Error handling

- If the `test` job fails, the `docker` job never runs (`needs: test` default behavior) — no image gets built or pushed for a broken commit.
- If `docker build` itself fails on a PR, the PR check fails, same as any other CI failure — no registry interaction was attempted, so nothing external is affected.
- If GHCR login or push fails on `main` (e.g. a transient registry outage), the workflow run fails and shows up in Actions — this is a build/deploy signal, not something the app code needs to handle.

## Out of scope

- No changes to the `test` job, its triggers, or any deployment step beyond publishing the image (no auto-deploy to a running environment — that's a separate concern).
- No image scanning/SBOM step — can be added later as its own job if wanted.
- No version-bump/semver tagging — tags are `latest` + short sha only, per the agreed design.

## Verification

1. Open a PR touching either repo — confirm the `docker` job runs, builds the image, and does **not** attempt a GHCR login (check the job log skips the "Log in to GHCR" step).
2. Merge to `main` (or push directly to `main` in a test) — confirm the `docker` job logs in, builds, and pushes; confirm `ghcr.io/rodgersBRY/ceoms-api:latest` and `ghcr.io/rodgersBRY/ceoms:latest` (plus their sha tags) appear under each repo's GHCR packages.
3. Confirm the new package's visibility/access matches expectations (GHCR packages default to inheriting repo visibility on first publish from a repo-scoped `GITHUB_TOKEN`).
