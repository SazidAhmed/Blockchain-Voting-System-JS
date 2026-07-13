#!/usr/bin/env bash
# scripts/ci.sh
# Single source of truth for CI. Runs locally AND in GitHub Actions.
# Usage: bash scripts/ci.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="infra/docker/docker-compose.yml"
ERRORS=0

run_step() {
  local label="$1"
  shift
  echo -e "${YELLOW}▸ $label${NC}"
  if "$@"; then
    echo -e "${GREEN}  ✓ $label passed${NC}"
  else
    echo -e "${RED}  ✗ $label failed${NC}"
    ERRORS=$((ERRORS + 1))
  fi
  echo ""
}

echo "============================================"
echo " Blockchain Voting System — CI"
echo "============================================"
echo ""

# --- Phase 1: Static checks ---
echo -e "${YELLOW}Phase 1: Static Checks${NC}"
run_step "Secrets scan"       bash "$SCRIPT_DIR/check-secrets.sh"
run_step "JS syntax"          bash "$SCRIPT_DIR/check-syntax.sh"
run_step "Branch name"        bash "$SCRIPT_DIR/check-branch-name.sh"
run_step ".env.example"       bash "$SCRIPT_DIR/check-env-example.sh"

# --- Phase 2: Docker build ---
echo -e "${YELLOW}Phase 2: Docker Build${NC}"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo -e "${RED}✗ Compose file not found: $COMPOSE_FILE${NC}"
  exit 1
fi
run_step "Docker build" docker compose -f "$COMPOSE_FILE" build

# --- Phase 3: Start and test ---
echo -e "${YELLOW}Phase 3: Integration Tests${NC}"
run_step "Create .env" bash -c 'cp .env.example .env && echo "JWT_SECRET=test-secret-key-for-ci-minimum-32-chars-long" >> .env'
run_step "Start services" docker compose -f "$COMPOSE_FILE" up -d

echo "Waiting for services..."
sleep 30

run_step "Backend API (port 3000)"  curl -sf http://localhost:3000/api/elections
run_step "Blockchain node (port 3001)" curl -sf http://localhost:3001/node
run_step "Frontend (port 5173)"     curl -sf http://localhost:5173

# --- Phase 4: Cleanup ---
echo -e "${YELLOW}Phase 4: Cleanup${NC}"
docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
echo ""

# --- Result ---
echo "============================================"
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}✗ $ERRORS check(s) failed.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ All CI checks passed.${NC}"
fi
