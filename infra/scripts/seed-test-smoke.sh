#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/seed-test-expected-values.sh"

echo -e "${BLUE}=== Smoke Test Seed (minimal) ===${NC}\n"

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_HOST/health" 2>/dev/null || echo "000")
if [ "$HEALTH" != "200" ]; then echo -e "${RED}Backend unreachable${NC}"; exit 1; fi

ADMIN_TOKEN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\"}" | "$JQ_CMD" -r '.token // empty')
if [ -z "$ADMIN_TOKEN" ]; then echo -e "${RED}Admin login failed. Run seed.js first.${NC}"; exit 1; fi

# 1 active election with 3 candidates
CAND_JSON='[{"name":"Alice","description":"Candidate Alice"},{"name":"Bob","description":"Candidate Bob"},{"name":"Charlie","description":"Candidate Charlie"}]'
RESP=$(curl -s -X POST "$BACKEND_URL/elections" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Smoke Test Election\",\"description\":\"For smoke tests\",\"startDate\":\"2025-01-01 00:00:00\",\"endDate\":\"2027-12-31 23:59:59\",\"candidates\":$CAND_JSON}")
EID=$(echo "$RESP" | "$JQ_CMD" -r '.id // empty')
[ -n "$EID" ] && curl -s -X PUT "$BACKEND_URL/elections/$EID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"active"}' > /dev/null && echo -e "${GREEN}✓ Election $EID created + activated${NC}"

# Voter
VOTER_HASH=$(docker exec voting-test-backend node -e "console.log(require('bcryptjs').hashSync('$SEED_VOTER_PASS', 10))" 2>/dev/null || echo "")
if [ -n "$VOTER_HASH" ]; then
  docker exec voting-test-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" \
    -N -e "INSERT IGNORE INTO users (institution_id, username, password, role, email, public_key, pseudonym_id, registration_status) VALUES
      ('STU00001','Smoke Test Voter','$VOTER_HASH','student','$SEED_VOTER_EMAIL','smoke-public-key',SHA2('STU00001',256),'verified');" 2>/dev/null
  echo -e "${GREEN}✓ Voter created${NC}"
fi
