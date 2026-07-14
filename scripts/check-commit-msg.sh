#!/usr/bin/env bash
# scripts/check-commit-msg.sh
# Validates commit message follows Conventional Commits format.
# Usage: bash scripts/check-commit-msg.sh "fix(backend): handle null election ID"
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

MSG="${1:-}"

if [ -z "$MSG" ]; then
  echo -e "${RED}✗ No commit message provided${NC}"
  echo "Usage: bash scripts/check-commit-msg.sh \"your message\""
  exit 1
fi

PATTERN='^(feat|fix|docs|style|refactor|test|chore|ci|build|perf|revert)(\(.+\))?: .{1,72}$'

if [[ "$MSG" =~ $PATTERN ]]; then
  echo -e "${GREEN}✓ Commit message is valid${NC}"
else
  echo -e "${RED}✗ Commit message does not follow Conventional Commits format${NC}"
  echo ""
  echo "Format: type(scope): description"
  echo ""
  echo "Types: feat, fix, docs, style, refactor, test, chore, ci, build, perf, revert"
  echo "Scope: optional, e.g., backend, frontend, blockchain, docker"
  echo ""
  echo "Examples:"
  echo "  fix(backend): handle null election ID"
  echo "  feat(voting): add ballot encryption"
  echo "  ci(workflows): add PR automation"
  echo "  docs: update deployment guide"
  exit 1
fi
