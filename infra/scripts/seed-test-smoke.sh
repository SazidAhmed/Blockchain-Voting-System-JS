#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../tests/test-config.sh"
source "$SCRIPT_DIR/seed-test-expected-values.sh"

echo -e "${BLUE}=== Smoke Test Seed (minimal) ===${NC}\n"

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_HOST/health" 2>/dev/null || echo "000")
if [ "$HEALTH" != "200" ]; then echo -e "${RED}Backend unreachable${NC}"; exit 1; fi

ADMIN_COOKIE=$(mktemp)
trap 'rm -f "$ADMIN_COOKIE"' EXIT
ADMIN_LOGIN=$(curl -s -c "$ADMIN_COOKIE" -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\",\"loginType\":\"admin\"}")
if [ -z "$(echo "$ADMIN_LOGIN" | "$JQ_CMD" -r '.user.id // empty')" ]; then echo -e "${RED}Admin login failed. Run seed.js first.${NC}"; exit 1; fi
CSRF=$(awk '$6 == "csrf-token" {print $7}' "$ADMIN_COOKIE" | tail -1)

# 1 active election with 3 candidates
CAND_JSON='[{"name":"Alice","description":"Candidate Alice"},{"name":"Bob","description":"Candidate Bob"},{"name":"Charlie","description":"Candidate Charlie"}]'
RESP=$(curl -s -b "$ADMIN_COOKIE" -X POST "$BACKEND_URL/elections" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d "{\"title\":\"Smoke Test Election\",\"description\":\"For smoke tests\",\"startDate\":\"2025-01-01 00:00:00\",\"endDate\":\"2027-12-31 23:59:59\",\"candidates\":$CAND_JSON}")
EID=$(echo "$RESP" | "$JQ_CMD" -r '.id // empty')
[ -n "$EID" ] && curl -s -b "$ADMIN_COOKIE" -X PATCH "$BACKEND_URL/elections/$EID/status" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d '{"status":"active"}' > /dev/null && echo -e "${GREEN}✓ Election $EID created + activated${NC}"

# Voter - detect containers dynamically
BACKEND_CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | head -1)
MYSQL_CONTAINER=$(docker ps --filter "name=mysql" --format "{{.Names}}" | head -1)

if [ -z "$BACKEND_CONTAINER" ] || [ -z "$MYSQL_CONTAINER" ]; then
  echo -e "${YELLOW}⚠ Could not find running containers (Backend: $BACKEND_CONTAINER, MySQL: $MYSQL_CONTAINER)${NC}"
  echo "  Skip voter seeding"
else
  VOTER_HASH=$(docker exec "$BACKEND_CONTAINER" node -e "console.log(require('bcryptjs').hashSync('$SEED_VOTER_PASS', 10))" 2>/dev/null || echo "")
  if [ -n "$VOTER_HASH" ]; then
    docker exec "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" \
      -N -e "INSERT IGNORE INTO users (institution_id, username, password, role, email, public_key, pseudonym_id, registration_status) VALUES
        ('STU00001','Smoke Test Voter','$VOTER_HASH','student','$SEED_VOTER_EMAIL','smoke-public-key',SHA2('STU00001',256),'verified');" 2>/dev/null
    echo -e "${GREEN}✓ Voter created${NC}"
  fi
fi
