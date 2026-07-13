#!/usr/bin/env bash
# scripts/check-syntax.sh
# Validates JavaScript syntax across all services.
# Run: bash scripts/check-syntax.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

SERVICES=("services/backend" "services/blockchain-node" "services/institution-api")
ERRORS=0

echo "Checking JavaScript syntax..."

for service in "${SERVICES[@]}"; do
  [ -d "$service" ] || continue
  echo "  Checking $service..."

  # Find all .js files, exclude node_modules
  while IFS= read -r file; do
    if ! node --check "$file" 2>/dev/null; then
      echo -e "  ${RED}✗ Syntax error: $file${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  done < <(find "$service" -name "*.js" -not -path "*/node_modules/*")
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo -e "${RED}Found $ERRORS syntax errors.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All JavaScript files have valid syntax${NC}"
