#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-config.sh"

ADMIN_COOKIE=$(mktemp)
VOTER_COOKIE=$(mktemp)
trap 'rm -f "$ADMIN_COOKIE" "$VOTER_COOKIE"' EXIT

echo -e "${BLUE}=== INTEGRATION TEST ===${NC}"
echo ""

# Login admin (cookie-based, httpOnly)
ADMIN_LOGIN=$(curl -s -c "$ADMIN_COOKIE" -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\",\"loginType\":\"admin\"}")
check "admin" "Admin login" [ -n "$(echo "$ADMIN_LOGIN" | "$JQ_CMD" -r '.user.id // empty')" ]

# Get active election
EID=$(curl -s -b "$ADMIN_COOKIE" -X GET "$BACKEND_URL/elections" | \
  "$JQ_CMD" -r '.[] | select(.status=="active") | .id' | head -1)
check "eid" "Active election ID: $EID" [ -n "$EID" ]

# Get candidates + election public key
DETAILS=$(curl -s -b "$ADMIN_COOKIE" -X GET "$BACKEND_URL/elections/$EID")
CID=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].id')
CNAME=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].name')
PUBKEY=$(echo "$DETAILS" | "$JQ_CMD" -r '.public_key // empty')
check "cid" "Candidate: $CNAME" [ -n "$CID" ]
check "pubkey" "Election public key present" [ -n "$PUBKEY" ]

# Login voter
VOTER_LOGIN=$(curl -s -c "$VOTER_COOKIE" -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"STU00002\",\"password\":\"$SEED_VOTER_PASS\",\"loginType\":\"voter\"}")
check "voter_login" "Voter login" [ -n "$(echo "$VOTER_LOGIN" | "$JQ_CMD" -r '.user.id // empty')" ]
VOTER_CSRF=$(csrf_token "$VOTER_COOKIE")

# Cast vote (client-side encrypted package)
echo -e "\n${BLUE}→ Cast vote${NC}"
VOTE_PKG=$(node "$VOTE_PACKAGE_HELPER" "$EID" "$CID" "$PUBKEY")
VOTE=$(curl -s -b "$VOTER_COOKIE" -X POST "$BACKEND_URL/elections/$EID/vote" -H "Content-Type: application/json" -H "x-csrf-token: $VOTER_CSRF" -d "$VOTE_PKG")
TXHASH=$(echo "$VOTE" | "$JQ_CMD" -r '.receipt.transactionHash // .transactionHash // empty')
check "tx" "Transaction hash" [ -n "$TXHASH" ]

# Wait for blockchain
sleep 2

# Verify blockchain propagation
echo -e "\n${BLUE}→ Blockchain verification${NC}"
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  H=$(curl -s -H "x-api-key: $BLOCKCHAIN_API_KEY" "http://localhost:$port/chain" 2>/dev/null | "$JQ_CMD" -r '.chain | length // 0')
  check "bh-n$port" "Node $port height: $H" [ "$H" -ge 0 ]
done

# Reject double vote
echo -e "\n${BLUE}→ Double-vote check${NC}"
DV=$(curl -s -b "$VOTER_COOKIE" -X POST "$BACKEND_URL/elections/$EID/vote" -H "Content-Type: application/json" -H "x-csrf-token: $VOTER_CSRF" -d "$VOTE_PKG")
DV_MSG=$(echo "$DV" | "$JQ_CMD" -r '.message // ""' | tr '[:upper:]' '[:lower:]')
# ponytail: check function can't pipe, use case instead
case "$DV_MSG" in
  *already*|*duplicate*|*voted*) DV_PASS=1 ;;
  *) DV_PASS=0 ;;
esac
check "dv" "Double-vote rejected (msg: ${DV_MSG:0:40})" [ "$DV_PASS" = "1" ]

# DB check
echo -e "\n${BLUE}→ Database${NC}"
VCOUNT=$(docker exec voting-test-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" \
  -N -e "SELECT COUNT(*) FROM votes_meta WHERE election_id=$EID;" 2>/dev/null || echo "0")
check "db_votes" "Votes in DB: $VCOUNT" [ "$VCOUNT" -ge 1 ]

summary
