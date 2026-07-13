#!/usr/bin/env bash
# scripts/check-branch-name.sh
# Validates current branch name follows convention.
# Run: bash scripts/check-branch-name.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [ -z "$BRANCH" ]; then
  echo -e "${RED}✗ Could not determine branch name${NC}"
  exit 1
fi

# Allow main, dev, and feature branches
PATTERN='^(main|dev|fix/[a-z0-9._-]+|feat/[a-z0-9._-]+|docs/[a-z0-9._-]+|refactor/[a-z0-9._-]+|ci/[a-z0-9._-]+|chore/[a-z0-9._-]+|test/[a-z0-9._-]+)$'

if [[ "$BRANCH" =~ $PATTERN ]]; then
  echo -e "${GREEN}✓ Branch name is valid: $BRANCH${NC}"
else
  echo -e "${RED}✗ Branch name does not follow convention: $BRANCH${NC}"
  echo ""
  echo "Expected formats:"
  echo "  main, dev"
  echo "  fix/<description>"
  echo "  feat/<description>"
  echo "  docs/<description>"
  echo "  refactor/<description>"
  echo "  ci/<description>"
  echo "  chore/<description>"
  exit 1
fi
