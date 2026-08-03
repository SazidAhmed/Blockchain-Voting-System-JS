#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-config.sh"

VOTER_COOKIE=$(mktemp)
ADMIN_COOKIE=$(mktemp)
trap 'rm -f "$VOTER_COOKIE" "$ADMIN_COOKIE"' EXIT

echo -e "${BLUE}=== SMOKE TEST ===${NC}"
echo ""

# T1: Health check
echo -e "${BLUE}[T1] System health${NC}"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_HOST/health" 2>/dev/null)
check "1a" "Backend healthy (HTTP $R)" [ "$R" = "200" ]
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  R=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $BLOCKCHAIN_API_KEY" "http://localhost:$port/health" 2>/dev/null)
  check "1b-n$port" "Blockchain node $port (HTTP $R)" [ "$R" = "200" ]
done

# T2: Login as admin
echo -e "\n${BLUE}[T2] Admin login${NC}"
LOGIN=$(curl -s -c "$ADMIN_COOKIE" -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\",\"loginType\":\"admin\"}")
check "2a" "Admin authenticated" [ -n "$(echo "$LOGIN" | "$JQ_CMD" -r '.user.id // empty')" ]

# T3: List elections
echo -e "\n${BLUE}[T3] Elections${NC}"
ELECTIONS=$(curl -s -b "$ADMIN_COOKIE" -X GET "$BACKEND_URL/elections")
EID=$(echo "$ELECTIONS" | "$JQ_CMD" -r '.[] | select(.status=="active") | .id // empty' 2>/dev/null | head -1)
check "3a" "Active election found (ID: ${EID:-none})" [ -n "$EID" ]

# T4: Election details + candidates
echo -e "\n${BLUE}[T4] Candidates${NC}"
DETAILS=$(curl -s -b "$ADMIN_COOKIE" -X GET "$BACKEND_URL/elections/$EID")
CID=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].id // empty' 2>/dev/null)
CNAME=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].name // empty' 2>/dev/null)
PUBKEY=$(echo "$DETAILS" | "$JQ_CMD" -r '.public_key // empty' 2>/dev/null)
check "4a" "Candidate: ${CNAME:-none}" [ -n "$CID" ]
check "4b" "Election public key present" [ -n "$PUBKEY" ]

# T5: Login as test voter
echo -e "\n${BLUE}[T5] Voter login${NC}"
VOTER_LOGIN=$(curl -s -c "$VOTER_COOKIE" -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"STU00001\",\"password\":\"$SEED_VOTER_PASS\",\"loginType\":\"voter\"}")
check "5a" "Voter authenticated" [ -n "$(echo "$VOTER_LOGIN" | "$JQ_CMD" -r '.user.id // empty')" ]
VOTER_CSRF=$(csrf_token "$VOTER_COOKIE")

# T6: Cast vote (client-side encrypted package)
echo -e "\n${BLUE}[T6] Vote casting${NC}"
VOTE_PKG=$(node "$VOTE_PACKAGE_HELPER" "$EID" "$CID" "$PUBKEY")
VOTE=$(curl -s -b "$VOTER_COOKIE" -X POST "$BACKEND_URL/elections/$EID/vote" -H "Content-Type: application/json" -H "x-csrf-token: $VOTER_CSRF" \
  -d "$VOTE_PKG")
TXHASH=$(echo "$VOTE" | "$JQ_CMD" -r '.receipt.transactionHash // .transactionHash // empty' 2>/dev/null)
RECEIPT_ID=$(echo "$VOTE" | "$JQ_CMD" -r '.receipt.receiptId // empty' 2>/dev/null)
check "6a" "Transaction hash: ${TXHASH:0:20}..." [ -n "$TXHASH" ]
check "6b" "Opaque receipt id: ${RECEIPT_ID:0:20}..." [ -n "$RECEIPT_ID" ]
sleep 3

# T7: Blockchain verification
echo -e "\n${BLUE}[T7] Blockchain nodes${NC}"
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  H=$(curl -s -H "x-api-key: $BLOCKCHAIN_API_KEY" "http://localhost:$port/chain" 2>/dev/null | "$JQ_CMD" -r '.chain | length // 0' 2>/dev/null)
  check "7a-n$port" "Node $port height: $H" [ "$H" -ge 0 ]
done

# T8: Double-vote prevention
echo -e "\n${BLUE}[T8] Double-vote prevention${NC}"
DV=$(curl -s -b "$VOTER_COOKIE" -X POST "$BACKEND_URL/elections/$EID/vote" -H "Content-Type: application/json" -H "x-csrf-token: $VOTER_CSRF" \
  -d "$VOTE_PKG")
DV_MSG=$(echo "$DV" | "$JQ_CMD" -r '.message // ""' 2>/dev/null | tr '[:upper:]' '[:lower:]')
case "$DV_MSG" in *already*|*duplicate*|*voted*) DV_PASS=1;; *) DV_PASS=0;; esac
check "8a" "Rejected: ${DV_MSG:0:60}" [ "$DV_PASS" = "1" ]

# T9: DB persistence
echo -e "\n${BLUE}[T9] Database${NC}"
VCOUNT=$(docker exec voting-test-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" \
  -N -e "SELECT COUNT(*) FROM votes_meta WHERE election_id='$EID';" 2>/dev/null || echo "0")
check "9a" "Vote in MySQL (count: $VCOUNT)" [ "$VCOUNT" -ge 1 ]

summary
