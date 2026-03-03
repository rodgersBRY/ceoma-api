#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${API_IMAGE:-}" ]]; then
  echo "API_IMAGE is required. Example: ghcr.io/<org>/ceoms-api:<tag>"
  exit 1
fi

if [[ ! -f ".env.prod" ]]; then
  echo ".env.prod is required in current directory"
  exit 1
fi

echo "[deploy] Pulling API image ${API_IMAGE}"
docker compose -f docker-compose.prod.yml pull api

echo "[deploy] Restarting API container"
docker compose -f docker-compose.prod.yml up -d --no-deps api

echo "[deploy] API health check"
curl -fsS http://localhost:4000/api/v1/health
echo

echo "[deploy] Running containers"
docker compose -f docker-compose.prod.yml ps
