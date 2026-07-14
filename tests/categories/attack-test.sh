#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-config.sh"

echo -e "${BLUE}=== ATTACK TEST ===${NC}"
echo ""

# Get tokens FIRST (before any rate limiting)
ADMIN_TOKEN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\"}" | "$JQ_CMD" -r '.token')

EID=$(curl -s -X GET "$BACKEND_URL/elections" -H "Authorization: Bearer $ADMIN_TOKEN" | \
  "$JQ_CMD" -r '.[] | select(.status=="active") | .id' | head -1)

DETAILS=$(curl -s -X GET "$BACKEND_URL/elections/$EID" -H "Authorization: Bearer $ADMIN_TOKEN")
CID=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].id')

VOTER_TOKEN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"STU00003\",\"password\":\"$SEED_VOTER_PASS\"}" | "$JQ_CMD" -r '.token')

# A1: Tampered ballot (bad candidateId)
echo -e "\n${BLUE}[A1] Tampered ballot${NC}"
A1=$(curl -s -X POST "$BACKEND_URL/elections/$EID/vote" -H "Authorization: Bearer $VOTER_TOKEN" \
  -H "Content-Type: application/json" -d '{"candidateId":99999,"privateKey":"test-key"}')
A1_MSG=$(echo "$A1" | "$JQ_CMD" -r '.message // ""' | tr '[:upper:]' '[:lower:]')
case "$A1_MSG" in *invalid*|*not.found*|*candidate*not*found*|*error*) A1_PASS=1;; *) A1_PASS=0;; esac
check "a1" "Bad candidate: ${A1_MSG:0:40}" [ "$A1_PASS" = "1" ]

# A2: Replay attack (first vote, then second same = replay)
echo -e "\n${BLUE}[A2] Replay attack${NC}"
curl -s -X POST "$BACKEND_URL/elections/$EID/vote" -H "Authorization: Bearer $VOTER_TOKEN" \
  -H "Content-Type: application/json" -d "{\"candidateId\":$CID,\"privateKey\":\"replay-key\"}" > /dev/null
A2=$(curl -s -X POST "$BACKEND_URL/elections/$EID/vote" -H "Authorization: Bearer $VOTER_TOKEN" \
  -H "Content-Type: application/json" -d "{\"candidateId\":$CID,\"privateKey\":\"replay-key\"}")
A2_MSG=$(echo "$A2" | "$JQ_CMD" -r '.message // ""' | tr '[:upper:]' '[:lower:]')
case "$A2_MSG" in *already*|*duplicate*|*voted*) A2_PASS=1;; *) A2_PASS=0;; esac
check "a2" "Replay blocked: ${A2_MSG:0:40}" [ "$A2_PASS" = "1" ]

# A3: SQL injection in login
echo -e "\n${BLUE}[A3] SQL injection${NC}"
A3=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d '{"institutionId":"ADMIN001","password":"'\'' OR 1=1 --"}')
A3_TOKEN=$(echo "$A3" | "$JQ_CMD" -r '.token // ""')
check "a3" "SQLi login blocked" [ -z "$A3_TOKEN" ]

# A4: No-auth access to admin endpoints
echo -e "\n${BLUE}[A4] No-auth admin${NC}"
A4=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/elections" \
  -H "Content-Type: application/json" \
  -d '{"title":"hack","description":"x","startDate":"2025-01-01 00:00:00","endDate":"2025-12-31 23:59:59","candidates":[{"name":"x","description":"x"}]}')
check "a4" "No-auth create election: HTTP $A4" [ "$A4" = "401" -o "$A4" = "403" ]

# A6: JWT tampering (protected endpoint)
echo -e "\n${BLUE}[A6] JWT tampering${NC}"
A6=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/elections" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.fake.tampered" \
  -H "Content-Type: application/json" \
  -d '{"title":"x","description":"x","startDate":"2025-01-01 00:00:00","endDate":"2025-12-31 23:59:59","candidates":[]}')
check "a6" "Bad JWT: HTTP $A6" [ "$A6" = "401" -o "$A6" = "403" ]

# A7: Large payload
echo -e "\n${BLUE}[A7] Large payload${NC}"
echo "{\"candidateId\":$CID,\"privateKey\":\"$(python3 -c "print('A'*50000)" 2>/dev/null || echo "AAAAA")\"}" > /tmp/large_payload.json
A7=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/elections/$EID/vote" \
  -H "Authorization: Bearer $VOTER_TOKEN" -H "Content-Type: application/json" \
  -d @/tmp/large_payload.json)
check "a7" "Large payload handled: HTTP $A7" [ "$A7" != "500" ]
rm -f /tmp/large_payload.json

# A8: Invalid election ID
echo -e "\n${BLUE}[A8] Invalid election ID${NC}"
A8=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/elections/999999/vote" \
  -H "Authorization: Bearer $VOTER_TOKEN" -H "Content-Type: application/json" \
  -d "{\"candidateId\":$CID,\"privateKey\":\"test\"}")
check "a8" "Bad election ID: HTTP $A8" [ "$A8" = "404" ]

# A5: Rate limiting (LAST — poisons the IP for subsequent requests)
echo -e "\n${BLUE}[A5] Rate limiting${NC}"
R429=0
for i in $(seq 1 30); do
  RC=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/users/login" \
    -H "Content-Type: application/json" -d '{"institutionId":"FAKE","password":"x"}')
  [ "$RC" = "429" ] && { R429=1; break; }
done
check "a5" "Rate limit hit (429)" [ "$R429" = "1" ]

summary
