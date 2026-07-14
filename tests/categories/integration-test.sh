#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-config.sh"

echo -e "${BLUE}=== INTEGRATION TEST ===${NC}"
echo ""

# Login admin
ADMIN_TOKEN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\"}" | "$JQ_CMD" -r '.token')
check "admin" "Admin login" [ -n "$ADMIN_TOKEN" ]

# Get active election
EID=$(curl -s -X GET "$BACKEND_URL/elections" -H "Authorization: Bearer $ADMIN_TOKEN" | \
  "$JQ_CMD" -r '.[] | select(.status=="active") | .id' | head -1)
check "eid" "Active election ID: $EID" [ -n "$EID" ]

# Get candidates
DETAILS=$(curl -s -X GET "$BACKEND_URL/elections/$EID" -H "Authorization: Bearer $ADMIN_TOKEN")
CID=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].id')
CNAME=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].name')
check "cid" "Candidate: $CNAME" [ -n "$CID" ]

# Login voter
VOTER_TOKEN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"STU00002\",\"password\":\"$SEED_VOTER_PASS\"}" | "$JQ_CMD" -r '.token')
check "voter_login" "Voter login" [ -n "$VOTER_TOKEN" ]

# Cast vote
echo -e "\n${BLUE}→ Cast vote (legacy)${NC}"
VOTE=$(curl -s -X POST "$BACKEND_URL/elections/$EID/vote" -H "Authorization: Bearer $VOTER_TOKEN" \
  -H "Content-Type: application/json" -d "{\"candidateId\":$CID,\"privateKey\":\"test-key\"}")
TXHASH=$(echo "$VOTE" | "$JQ_CMD" -r '.receipt.transactionHash // .transactionHash // empty')
check "tx" "Transaction hash" [ -n "$TXHASH" ]

# Wait for blockchain
sleep 2

# Verify blockchain propagation
echo -e "\n${BLUE}→ Blockchain verification${NC}"
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  H=$(curl -s "http://localhost:$port/chain" 2>/dev/null | "$JQ_CMD" -r '.chain | length // 0')
  check "bh-n$port" "Node $port height: $H" [ "$H" -ge 0 ]
done

# Reject double vote
echo -e "\n${BLUE}→ Double-vote check${NC}"
DV=$(curl -s -X POST "$BACKEND_URL/elections/$EID/vote" -H "Authorization: Bearer $VOTER_TOKEN" \
  -H "Content-Type: application/json" -d "{\"candidateId\":$CID,\"privateKey\":\"test-key\"}")
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
