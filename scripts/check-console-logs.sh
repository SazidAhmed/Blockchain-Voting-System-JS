#!/usr/bin/env bash
# scripts/check-console-logs.sh
# Flags console.log in backend/blockchain code (should not ship to production).
# Run: bash scripts/check-console-logs.sh
set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

SERVICES=("services/backend" "services/blockchain-node" "services/institution-api")
WARNINGS=0

echo "Checking for console.log in backend services..."

for service in "${SERVICES[@]}"; do
  [ -d "$service" ] || continue

  while IFS= read -r file; do
    MATCHES=$(grep -n "console\.log" "$file" 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
      echo -e "  ${YELLOW}console.log in $file:${NC}"
      echo "$MATCHES" | head -5 | sed 's/^/    /'
      WARNINGS=$((WARNINGS + 1))
    fi
  done < <(find "$service" -name "*.js" -not -path "*/node_modules/*")
done

if [ "$WARNINGS" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}Warning: $WARNINGS files have console.log statements.${NC}"
  echo "Consider removing them for production. This is a warning, not a blocker."
fi

echo -e "${GREEN}✓ Done${NC}"
