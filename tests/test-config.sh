#!/bin/bash
# Centralized test configuration — source this from any test script.
# Reads from .env.test (if exists) with sensible defaults for isolated test Docker.

TEST_CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$TEST_CONFIG_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.test"

# Ensure jq is available
JQ_BIN="${JQ_BIN:-$(which jq 2>/dev/null || echo '')}"
if [ -z "$JQ_BIN" ]; then
    echo "ERROR: jq is required but not found. Install jq (brew install jq / apt install jq)"
    exit 1
fi
JQ_CMD="$JQ_BIN"
export JQ_CMD

# Load .env.test if present
if [ -f "$ENV_FILE" ]; then
  set -o allexport
  source "$ENV_FILE"
  set +o allexport
fi

# Backend
BACKEND_URL="${TEST_BACKEND_URL:-${VITE_API_BASE_URL:-http://localhost:3005/api}}"
BACKEND_HOST="${TEST_BACKEND_HOST:-http://localhost:3005}"

# Blockchain nodes
BLOCKCHAIN_PORTS=(${TEST_BLOCKCHAIN_PORTS:-3010 3011 3012 3013})
BLOCKCHAIN_URL="${TEST_BLOCKCHAIN_URL:-${VITE_BLOCKCHAIN_URL:-http://localhost:3010}}"
BLOCKCHAIN_API_KEY="${TEST_BLOCKCHAIN_API_KEY:-test-blockchain-key}"

# Vote package helper (builds a client-side encrypted vote payload)
VOTE_PACKAGE_HELPER="$TEST_CONFIG_DIR/helpers/vote-package.js"

# Institution API
INSTITUTION_API_URL="${TEST_INSTITUTION_URL:-${VITE_INSTITUTION_API_URL:-http://localhost:4005}}"

# MySQL
MYSQL_HOST="${TEST_MYSQL_HOST:-localhost}"
MYSQL_PORT="${TEST_MYSQL_PORT:-3307}"
MYSQL_USER="${MYSQL_USER:-voting_test_user}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-voting_test_pass}"
MYSQL_DATABASE="${MYSQL_DATABASE:-voting_test_db}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-voting_test_root_pass}"

# Admin credentials
SEED_ADMIN_ID="${SEED_ADMIN_ID:-ADMIN001}"
SEED_ADMIN_PASS="${SEED_ADMIN_PASS:-admin123}"

# Seed user credentials
SEED_VOTER_PASS="${SEED_VOTER_PASS:-DemoPass123!}"
SEED_VOTER_EMAIL="${SEED_VOTER_EMAIL:-demo-voter@university.edu}"

# Docker
COMPOSE_FILE="${TEST_COMPOSE_FILE:-infra/docker/docker-compose.test.yml}"
COMPOSE_PROJECT="${TEST_COMPOSE_PROJECT:-voting-test}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test counters (declare as globals, reset per script)
PASS=0; FAIL=0

# Read the CSRF token from a curl cookie jar (login sets csrf-token via backend)
csrf_token() {
  awk '$6 == "csrf-token" {print $7}' "$1" 2>/dev/null | tail -1
}

# Helper assert
check() {
  local num="$1" desc="$2"
  shift 2
  if "$@"; then
    echo -e "  ${GREEN}✓${NC} $desc"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${NC} $desc"
    FAIL=$((FAIL+1))
  fi
}

summary() {
  echo -e "\n${BLUE}=== SUMMARY ===${NC}"
  echo -e "  ${GREEN}Passed: $PASS${NC}  ${RED}Failed: $FAIL${NC}"
  if [ "$FAIL" -eq 0 ]; then exit 0; else exit 1; fi
}
