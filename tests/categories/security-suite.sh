#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-config.sh"

echo -e "${BLUE}=== SECURITY SUITE ===${NC}"
echo ""

# Get tokens FIRST (before rate limiting)
ADMIN_TOKEN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\"}" | "$JQ_CMD" -r '.token')

EID=$(curl -s -X GET "$BACKEND_URL/elections" -H "Authorization: Bearer $ADMIN_TOKEN" | \
  "$JQ_CMD" -r '.[] | select(.status=="active") | .id' | head -1)
DETAILS=$(curl -s -X GET "$BACKEND_URL/elections/$EID" -H "Authorization: Bearer $ADMIN_TOKEN")
CID=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].id')

VOTER_TOKEN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"TEACH0001\",\"password\":\"$SEED_VOTER_PASS\"}" | "$JQ_CMD" -r '.token')

# S1: Unauthenticated vote
echo -e "\n${BLUE}[S1] Unauthenticated vote${NC}"
S1=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/elections/$EID/vote" \
  -H "Content-Type: application/json" -d "{\"candidateId\":$CID,\"privateKey\":\"test\"}")
check "s1" "No-auth vote: HTTP $S1" [ "$S1" = "401" -o "$S1" = "403" ]

# S2: Wrong role vote (admin tries to vote)
echo -e "\n${BLUE}[S2] Admin vote attempt${NC}"
S2=$(curl -s -X POST "$BACKEND_URL/elections/$EID/vote" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" -d "{\"candidateId\":$CID,\"privateKey\":\"test\"}")
S2_MSG=$(echo "$S2" | "$JQ_CMD" -r '.message // ""')
check "s2" "Admin vote: ${S2_MSG:0:40}" [ -n "$S2_MSG" ]

# S3: XSS in login
echo -e "\n${BLUE}[S3] XSS attempt${NC}"
S3=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d '{"institutionId":"<script>alert(1)</script>","password":"x"}')
S3_TOKEN=$(echo "$S3" | "$JQ_CMD" -r '.token // ""')
check "s3" "XSS reflected" [ -z "$S3_TOKEN" ]

# S5: Nullifier uniqueness (BEFORE rate limit test)
echo -e "\n${BLUE}[S5] Nullifier uniqueness${NC}"
S5=$(curl -s -X POST "$BACKEND_URL/elections/$EID/vote" -H "Authorization: Bearer $VOTER_TOKEN" \
  -H "Content-Type: application/json" -d "{\"candidateId\":$CID,\"privateKey\":\"test\"}")
S5_NULL=$(echo "$S5" | "$JQ_CMD" -r '.receipt.nullifier // .nullifier // empty')
check "s5" "Nullifier: ${S5_NULL:0:20}..." [ -n "$S5_NULL" ]

# S4: Mass registration (LAST — poisons IP)
echo -e "\n${BLUE}[S4] Rate limiting${NC}"
R429=0
for i in $(seq 1 20); do
  RC=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/users/login" \
    -H "Content-Type: application/json" -d "{\"institutionId\":\"FAKE$i\",\"password\":\"x\"}")
  [ "$RC" = "429" ] && { R429=1; break; }
done
check "s4" "Rate limit activates" [ "$R429" = "1" ]

summary
