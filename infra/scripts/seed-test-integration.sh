#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../tests/test-config.sh"
source "$SCRIPT_DIR/seed-test-expected-values.sh"

echo -e "${BLUE}=== Seed: Integration Test Data ===${NC}"

"$SCRIPT_DIR/seed-test-smoke.sh"

ADMIN_COOKIE=$(mktemp)
trap 'rm -f "$ADMIN_COOKIE"' EXIT
ADMIN_LOGIN=$(curl -s -c "$ADMIN_COOKIE" -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\",\"loginType\":\"admin\"}")
if [ -z "$(echo "$ADMIN_LOGIN" | "$JQ_CMD" -r '.user.id // empty')" ]; then
  echo -e "${RED}Admin login failed. Run seed.js first.${NC}"; exit 1
fi
CSRF=$(awk '$6 == "csrf-token" {print $7}' "$ADMIN_COOKIE" | tail -1)

REG2=$(curl -s -X POST "$BACKEND_URL/users/register" -H "Content-Type: application/json" \
  -d "{\"name\":\"Integration Voter 2\",\"email\":\"integ-voter2@test.edu\",\"password\":\"TestPass123!\",\"studentId\":\"INTEG002\"}")
if echo "$REG2" | "$JQ_CMD" -e '.userId' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Integration voter 2 created${NC}"
fi

ELECTIONS=$(curl -s -b "$ADMIN_COOKIE" -X GET "$BACKEND_URL/elections")
EID=$(echo "$ELECTIONS" | jq -r '.[0].id // empty' 2>/dev/null)
if [ -n "$EID" ]; then
  curl -s -b "$ADMIN_COOKIE" -X POST "$BACKEND_URL/elections/$EID/candidates" \
    -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" -d "{\"name\":\"Integration Candidate 4\",\"party\":\"Integ Party\"}" > /dev/null
  curl -s -b "$ADMIN_COOKIE" -X POST "$BACKEND_URL/elections/$EID/candidates" \
    -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" -d "{\"name\":\"Integration Candidate 5\",\"party\":\"Integ Party\"}" > /dev/null
  echo -e "${GREEN}✓ Extra candidates added${NC}"
fi

echo -e "${GREEN}✓ Integration seed complete${NC}"
