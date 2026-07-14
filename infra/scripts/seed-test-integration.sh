#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../tests/test-config.sh"
source "$SCRIPT_DIR/seed-test-expected-values.sh"

echo -e "${BLUE}=== Seed: Integration Test Data ===${NC}"

"$SCRIPT_DIR/seed-test-smoke.sh"

ADMIN_LOGIN=$(curl -s -X POST "$BACKEND_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$SEED_ADMIN_EMAIL\",\"password\":\"$SEED_ADMIN_PASS\"}")
TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.token')

REG2=$(curl -s -X POST "$BACKEND_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"name\":\"Integration Voter 2\",\"email\":\"integ-voter2@test.edu\",\"password\":\"TestPass123!\",\"studentId\":\"INTEG002\"}")
if echo "$REG2" | jq -e '.userId' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Integration voter 2 created${NC}"
fi

ELECTIONS=$(curl -s -X GET "$BACKEND_URL/elections" -H "Authorization: Bearer $TOKEN")
EID=$(echo "$ELECTIONS" | jq -r '.[0].id // empty' 2>/dev/null)
if [ -n "$EID" ]; then
  curl -s -X POST "$BACKEND_URL/elections/$EID/candidates" -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" -d "{\"name\":\"Integration Candidate 4\",\"party\":\"Integ Party\"}" > /dev/null
  curl -s -X POST "$BACKEND_URL/elections/$EID/candidates" -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" -d "{\"name\":\"Integration Candidate 5\",\"party\":\"Integ Party\"}" > /dev/null
  echo -e "${GREEN}✓ Extra candidates added${NC}"
fi

echo -e "${GREEN}✓ Integration seed complete${NC}"
