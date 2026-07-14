#!/usr/bin/env bash
# scripts/run-all-checks.sh
# Runs all local checks before pushing. Your pre-push validation.
# Run: bash scripts/run-all-checks.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ERRORS=0

echo "============================================"
echo " Blockchain Voting System — Local Checks"
echo "============================================"
echo ""

# 1. Branch name
echo -e "${YELLOW}[1/6] Branch name${NC}"
if bash "$SCRIPT_DIR/check-branch-name.sh"; then
  echo ""
else
  ERRORS=$((ERRORS + 1))
  echo ""
fi

# 2. Commit message (check latest commit)
echo -e "${YELLOW}[2/6] Latest commit message${NC}"
LATEST_MSG=$(git log -1 --pretty=%s 2>/dev/null || echo "")
if [ -n "$LATEST_MSG" ]; then
  if bash "$SCRIPT_DIR/check-commit-msg.sh" "$LATEST_MSG"; then
    echo ""
  else
    ERRORS=$((ERRORS + 1))
    echo ""
  fi
else
  echo "  No commits yet, skipping."
  echo ""
fi

# 3. Secrets
echo -e "${YELLOW}[3/6] Secrets scan${NC}"
if bash "$SCRIPT_DIR/check-secrets.sh"; then
  echo ""
else
  ERRORS=$((ERRORS + 1))
  echo ""
fi

# 4. JavaScript syntax
echo -e "${YELLOW}[4/6] JavaScript syntax${NC}"
if bash "$SCRIPT_DIR/check-syntax.sh"; then
  echo ""
else
  ERRORS=$((ERRORS + 1))
  echo ""
fi

# 5. Console.log warning
echo -e "${YELLOW}[5/6] Console.log check${NC}"
bash "$SCRIPT_DIR/check-console-logs.sh" || true
echo ""

# 6. .env.example
echo -e "${YELLOW}[6/6] .env.example coverage${NC}"
if bash "$SCRIPT_DIR/check-env-example.sh"; then
  echo ""
else
  ERRORS=$((ERRORS + 1))
  echo ""
fi

echo "============================================"
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}✗ $ERRORS check(s) failed. Fix before pushing.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ All checks passed. Safe to push.${NC}"
fi
