#!/usr/bin/env bash
# scripts/check-secrets.sh
# Scans code for accidentally committed secrets.
# Matches actual secret values, not comments or documentation.
# Run: bash scripts/check-secrets.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

FOUND=0

check_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  MATCHES=$(grep -niE "$pattern" "$file" 2>/dev/null || true)
  if [ -z "$MATCHES" ]; then
    return
  fi

  REAL_HITS=""
  while IFS= read -r line; do
    CONTENT=$(echo "$line" | sed 's/^[0-9]*://')
    [[ "$CONTENT" =~ ^[[:space:]]*(//|#|/\*|\*|\*\*) ]] && continue
    [[ "$CONTENT" =~ @[a-z]+ ]] && continue
    [[ "$CONTENT" =~ console\.(log|warn|error|info) ]] && continue
    [[ ! "$CONTENT" =~ [:=\"] ]] && continue
    REAL_HITS="${REAL_HITS}${line}\n"
  done <<< "$MATCHES"

  if [ -n "$REAL_HITS" ]; then
    echo -e "${RED}⚠ SECRET FOUND${NC} in $file ($label)"
    echo -e "$REAL_HITS" | head -3 | sed 's/^/    /'
    FOUND=1
  fi
}

echo "Checking for secrets..."

STAGED=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || echo "")
if [ -z "$STAGED" ]; then
  STAGED=$(find services/ -name "*.js" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.env*" 2>/dev/null)
fi

for file in $STAGED; do
  [ -f "$file" ] || continue
  [[ "$file" == *".env.example" ]] && continue
  [[ "$file" == *"node_modules"* ]] && continue
  [[ "$file" == scripts/* ]] && continue
  [[ "$file" == .githooks/* ]] && continue
  [[ "$file" == *.md ]] && continue
  [[ "$file" == *test* ]] && continue
  [[ "$file" == *spec* ]] && continue
  [[ "$file" == *reference* ]] && continue
  [[ "$file" == *example* ]] && continue

  check_pattern "$file" "-----BEGIN.*PRIVATE KEY-----" "PEM key block"
  check_pattern "$file" "password\s*[:=]\s*[\"'][^\"']{8,}" "hardcoded password"
  check_pattern "$file" "API_KEY\s*[:=]\s*[\"'][^\"']{8,}" "hardcoded API key"
  check_pattern "$file" "SECRET\s*[:=]\s*[\"'][^\"']{8,}" "hardcoded secret"
  check_pattern "$file" "JWT_SECRET\s*[:=]\s*[\"'][^\"']{8,}" "hardcoded JWT secret"
  check_pattern "$file" "mysql://[^\"' \t]+:[^\"' \t]+@" "MySQL connection string"
  check_pattern "$file" "mongodb(\+srv)?://[^\"' \t]+:[^\"' \t]+@" "MongoDB connection string"
  check_pattern "$file" "AKIA[0-9A-Z]{16}" "AWS access key"
  check_pattern "$file" "privateKey\s*[:=]\s*[\"'][A-Za-z0-9+/=]{20,}" "hardcoded private key"
done

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo -e "${RED}Blocked: secrets detected. Remove them before committing.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ No secrets found${NC}"
