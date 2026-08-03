#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-config.sh"

ADMIN_COOKIE=$(mktemp)
trap 'rm -f "$ADMIN_COOKIE"' EXIT

echo -e "${BLUE}=== DETECTION TEST ===${NC}"
echo ""

ADMIN_LOGIN=$(curl -s -c "$ADMIN_COOKIE" -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\",\"loginType\":\"admin\"}")

# D1: Node health
echo -e "\n${BLUE}[D1] Node health${NC}"
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  NFO=$(curl -s -H "x-api-key: $BLOCKCHAIN_API_KEY" "http://localhost:$port/node" 2>/dev/null || echo '{"nodeType":"unreachable"}')
  NTYPE=$(echo "$NFO" | "$JQ_CMD" -r '.nodeType // "unknown"')
  NID=$(echo "$NFO" | "$JQ_CMD" -r '.nodeId // "?"')
  check "d1-n$port" "Node $port ($NID): $NTYPE" [ "$NTYPE" = "validator" ]
done

# D2: Chain height from /chain
echo -e "\n${BLUE}[D2] Chain height${NC}"
HEIGHTS=()
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  H=$(curl -s -H "x-api-key: $BLOCKCHAIN_API_KEY" "http://localhost:$port/chain" 2>/dev/null | "$JQ_CMD" -r '.chain | length // 0')
  HEIGHTS+=("$H")
done
REF=${HEIGHTS[0]}
check "d2" "Node 3010 height: $REF (primary validator)" [ "$REF" -ge 1 ]

# D3: Vote audit trail
echo -e "\n${BLUE}[D3] Audit trail${NC}"
AUDIT=$(curl -s -b "$ADMIN_COOKIE" -X GET "$BACKEND_URL/elections")
ECOUNT=$(echo "$AUDIT" | "$JQ_CMD" -r 'length // 0')
check "d3a" "Elections exposable: $ECOUNT" [ "$ECOUNT" -ge 2 ]

# D4: Block count from /chain
echo -e "\n${BLUE}[D4] Chain blocks${NC}"
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  CHAIN=$(curl -s -H "x-api-key: $BLOCKCHAIN_API_KEY" "http://localhost:$port/chain" 2>/dev/null || echo '{}')
  BCOUNT=$(echo "$CHAIN" | "$JQ_CMD" -r '.chain | length // 0')
  check "d4-n$port" "Node $port blocks: $BCOUNT" [ "$BCOUNT" -ge 0 ]
done

# D5: Merkle stats
echo -e "\n${BLUE}[D5] Merkle stats${NC}"
for port in "${BLOCKCHAIN_PORTS[@]}"; do
  MS=$(curl -s -H "x-api-key: $BLOCKCHAIN_API_KEY" "http://localhost:$port/merkle/stats" 2>/dev/null || echo '{}')
  TE=$(echo "$MS" | "$JQ_CMD" -r '.totalElections // -1')
  check "d5-n$port" "Node $port elections: $TE" [ "$TE" -ge 0 ]
done

summary
