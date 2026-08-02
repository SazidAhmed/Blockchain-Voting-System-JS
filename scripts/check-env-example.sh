#!/usr/bin/env bash
# scripts/check-env-example.sh
# Ensures .env.example covers all env vars used in code.
# Run: bash scripts/check-env-example.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "Checking .env.example covers all required env vars..."

# Extract env vars from code (process.env.VAR_NAME pattern)
CODE_VARS=$(grep -rohE 'process\.env\.([A-Z0-9_]+)' services/ --include="*.js" --exclude-dir=node_modules 2>/dev/null \
  | sed 's/process\.env\.//' | sort -u)

# Vars with an inline fallback (process.env.X || default) are optional — not required in .env.example
FALLBACK_VARS=$(grep -rohE 'process\.env\.[A-Z0-9_]+[[:space:]]*\|\|' services/ --include="*.js" --exclude-dir=node_modules 2>/dev/null \
  | sed 's/process\.env\.//; s/[[:space:]]*||.*//' | sort -u)

# Extract vars from .env.example
if [ -f ".env.example" ]; then
  EXAMPLE_VARS=$(grep -v '^#' .env.example | grep -v '^$' | cut -d'=' -f1 | sort -u)
else
  echo -e "${RED}✗ .env.example not found${NC}"
  exit 1
fi

MISSING=0
for var in $CODE_VARS; do
  if echo "$FALLBACK_VARS" | grep -qx "$var"; then
    continue
  fi
  if ! echo "$EXAMPLE_VARS" | grep -qx "$var"; then
    echo -e "${RED}✗ Missing from .env.example: $var${NC}"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo -e "${RED}Add missing vars to .env.example.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ .env.example is up to date${NC}"
