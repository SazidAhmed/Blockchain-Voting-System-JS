#!/usr/bin/env bash
# scripts/check-docker.sh
# Verifies Docker build works for all services.
# Run: bash scripts/check-docker.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

COMPOSE_FILE="infra/docker/docker-compose.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}✗ Compose file not found: $COMPOSE_FILE${NC}"
  exit 1
fi

echo "Building Docker images..."
if docker compose -f "$COMPOSE_FILE" build 2>&1; then
  echo -e "${GREEN}✓ Docker build successful${NC}"
else
  echo -e "${RED}✗ Docker build failed${NC}"
  exit 1
fi
