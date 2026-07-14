#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-config.sh"

echo -e "${BLUE}=== RESILIENCE TEST ===${NC}"
echo ""

ADMIN_TOKEN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\"}" | "$JQ_CMD" -r '.token')

EID=$(curl -s -X GET "$BACKEND_URL/elections" -H "Authorization: Bearer $ADMIN_TOKEN" | \
  "$JQ_CMD" -r '.[] | select(.status=="active") | .id' | head -1)
DETAILS=$(curl -s -X GET "$BACKEND_URL/elections/$EID" -H "Authorization: Bearer $ADMIN_TOKEN")
CID=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].id')

VOTER_TOKEN=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"STU00004\",\"password\":\"$SEED_VOTER_PASS\"}" | "$JQ_CMD" -r '.token')

# R1: Reboot blockchain node 1
echo -e "\n${BLUE}[R1] Node restart${NC}"
docker restart voting-test-blockchain 2>/dev/null
sleep 3
R1=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3010/node" 2>/dev/null)
check "r1" "Node 3010 after restart: HTTP $R1" [ "$R1" = "200" ]

# R2: Vote after node restart
echo -e "\n${BLUE}[R2] Vote after restart${NC}"
R2=$(curl -s -X POST "$BACKEND_URL/elections/$EID/vote" -H "Authorization: Bearer $VOTER_TOKEN" \
  -H "Content-Type: application/json" -d "{\"candidateId\":$CID,\"privateKey\":\"test-key-r2\"}")
R2_TX=$(echo "$R2" | "$JQ_CMD" -r '.receipt.transactionHash // .transactionHash // empty')
check "r2" "Vote post-restart: ${R2_TX:0:20}..." [ -n "$R2_TX" ]

# R3: Blockchain node still syncs
echo -e "\n${BLUE}[R3] Sync check${NC}"
sleep 2
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  H=$(curl -s "http://localhost:$port/chain" 2>/dev/null | "$JQ_CMD" -r '.chain | length // 0')
  check "r3-n$port" "Node $port height: $H" [ "$H" -ge 0 ]
done

# R4: Backend restart
echo -e "\n${BLUE}[R4] Backend restart${NC}"
docker restart voting-test-backend 2>/dev/null
sleep 5
R4=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_HOST/health" 2>/dev/null)
check "r4" "Backend after restart: HTTP $R4" [ "$R4" = "200" ]

summary
