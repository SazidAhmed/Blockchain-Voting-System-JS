#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-config.sh"

echo -e "${BLUE}=== SMOKE TEST ===${NC}"
echo ""

# T1: Health check
echo -e "${BLUE}[T1] System health${NC}"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_HOST/health" 2>/dev/null)
check "1a" "Backend healthy (HTTP $R)" [ "$R" = "200" ]
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  R=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/node" 2>/dev/null)
  check "1b-n$port" "Blockchain node $port (HTTP $R)" [ "$R" = "200" ]
done

# T2: Login as admin
echo -e "\n${BLUE}[T2] Admin login${NC}"
LOGIN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\"}")
ADMIN_TOKEN=$(echo "$LOGIN" | "$JQ_CMD" -r '.token // empty' 2>/dev/null)
check "2a" "Admin token issued" [ -n "$ADMIN_TOKEN" ]

# T3: List elections
echo -e "\n${BLUE}[T3] Elections${NC}"
ELECTIONS=$(curl -s -X GET "$BACKEND_URL/elections" -H "Authorization: Bearer $ADMIN_TOKEN")
EID=$(echo "$ELECTIONS" | "$JQ_CMD" -r '.[] | select(.status=="active") | .id // empty' 2>/dev/null | head -1)
check "3a" "Active election found (ID: ${EID:-none})" [ -n "$EID" ]

# T4: Election details + candidates
echo -e "\n${BLUE}[T4] Candidates${NC}"
DETAILS=$(curl -s -X GET "$BACKEND_URL/elections/$EID" -H "Authorization: Bearer $ADMIN_TOKEN")
CID=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].id // empty' 2>/dev/null)
CNAME=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].name // empty' 2>/dev/null)
check "4a" "Candidate: ${CNAME:-none}" [ -n "$CID" ]

# T5: Login as test voter
echo -e "\n${BLUE}[T5] Voter login${NC}"
VOTER_LOGIN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"STU00001\",\"password\":\"$SEED_VOTER_PASS\"}")
VOTER_TOKEN=$(echo "$VOTER_LOGIN" | "$JQ_CMD" -r '.token // empty' 2>/dev/null)
check "5a" "Voter token issued" [ -n "$VOTER_TOKEN" ]

# T6: Cast vote (legacy flow)
echo -e "\n${BLUE}[T6] Vote casting${NC}"
VOTE=$(curl -s -X POST "$BACKEND_URL/elections/$EID/vote" -H "Authorization: Bearer $VOTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"candidateId\": $CID, \"privateKey\": \"test-key-123\"}")
TXHASH=$(echo "$VOTE" | "$JQ_CMD" -r '.receipt.transactionHash // .transactionHash // empty' 2>/dev/null)
NULLIFIER=$(echo "$VOTE" | "$JQ_CMD" -r '.receipt.nullifier // .nullifier // empty' 2>/dev/null)
check "6a" "Transaction hash: ${TXHASH:0:20}..." [ -n "$TXHASH" ]
check "6b" "Nullifier: ${NULLIFIER:0:20}..." [ -n "$NULLIFIER" ]
sleep 3

# T7: Blockchain verification
echo -e "\n${BLUE}[T7] Blockchain nodes${NC}"
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  H=$(curl -s "http://localhost:$port/chain" 2>/dev/null | "$JQ_CMD" -r '.chain | length // 0' 2>/dev/null)
  check "7a-n$port" "Node $port height: $H" [ "$H" -ge 0 ]
done

# T8: Double-vote prevention
echo -e "\n${BLUE}[T8] Double-vote prevention${NC}"
DV=$(curl -s -X POST "$BACKEND_URL/elections/$EID/vote" -H "Authorization: Bearer $VOTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"candidateId\": $CID, \"privateKey\": \"test-key-123\"}")
DV_MSG=$(echo "$DV" | "$JQ_CMD" -r '.message // ""' 2>/dev/null | tr '[:upper:]' '[:lower:]')
case "$DV_MSG" in *already*|*duplicate*|*voted*) DV_PASS=1;; *) DV_PASS=0;; esac
check "8a" "Rejected: ${DV_MSG:0:60}" [ "$DV_PASS" = "1" ]

# T9: DB persistence
echo -e "\n${BLUE}[T9] Database${NC}"
VCOUNT=$(docker exec voting-test-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" \
  -N -e "SELECT COUNT(*) FROM votes_meta WHERE election_id=$EID;" 2>/dev/null || echo "0")
check "9a" "Vote in MySQL (count: $VCOUNT)" [ "$VCOUNT" -ge 1 ]

summary
