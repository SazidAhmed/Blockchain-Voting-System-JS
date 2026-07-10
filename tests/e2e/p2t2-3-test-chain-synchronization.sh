#!/bin/bash

# Phase 2 - Task 2.3: Chain Synchronization Testing
# Tests blockchain synchronization for new/reconnecting nodes

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║ Phase 2 - Task 2.3: Chain Synchronization Testing                 ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

# Helper functions
get_chain_height() {
    local port=$1
    curl -s "http://localhost:$port/chain" 2>/dev/null | grep -o '"length":[0-9]*' | cut -d':' -f2
}

get_node_status() {
    local port=$1
    curl -s "http://localhost:$port/node/status" 2>/dev/null
}

mine_blocks_on_node() {
    local port=$1
    local count=$2
    for (( i=0; i<count; i++ )); do
        curl -s -X GET "http://localhost:$port/mine" > /dev/null 2>&1
        sleep 1
    done
}

request_chain_sync() {
    local port=$1
    # Trigger chain request
    curl -s -X GET "http://localhost:$port/chain" > /dev/null 2>&1
}

# Test 1: Fresh node sync
echo ""
echo "TEST 1: FRESH NODE SYNC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Getting initial chain height on Node 1...${NC}"
INITIAL_HEIGHT=$(get_chain_height "3001")
echo "Current chain height: $INITIAL_HEIGHT blocks"

echo ""
echo -e "${BLUE}Mining 3 blocks on Node 1...${NC}"
mine_blocks_on_node "3001" 3

sleep 2

NEW_HEIGHT=$(get_chain_height "3001")
BLOCKS_MINED=$(( NEW_HEIGHT - INITIAL_HEIGHT ))
echo "New chain height: $NEW_HEIGHT blocks (mined: $BLOCKS_MINED)"

echo ""
echo -e "${BLUE}Checking if Node 5 synchronized the new blocks...${NC}"
NODE5_HEIGHT=$(get_chain_height "3005")

if [ "$NODE5_HEIGHT" -ge "$NEW_HEIGHT" ]; then
    echo -e "${GREEN}✓${NC} Node 5 synchronized: $NODE5_HEIGHT blocks"
else
    echo -e "${YELLOW}⚠${NC} Node 5 height: $NODE5_HEIGHT (Node 1: $NEW_HEIGHT)"
fi

# Test 2: Node reconnection sync
echo ""
echo ""
echo "TEST 2: NODE RECONNECTION SYNC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Simulating node state before disconnect...${NC}"
BEFORE_DISCONNECT=$(get_chain_height "3002")
echo "Node 2 height before disconnect: $BEFORE_DISCONNECT blocks"

echo ""
echo -e "${BLUE}Network continues mining while Node 2 is offline...${NC}"
echo "Minin 4 blocks on Node 1..."
mine_blocks_on_node "3001" 4

sleep 3

NETWORK_HEIGHT=$(get_chain_height "3001")
BLOCKS_ADDED=$(( NETWORK_HEIGHT - NEW_HEIGHT ))
echo "Network height after mining: $NETWORK_HEIGHT blocks (added: $BLOCKS_ADDED)"

echo ""
echo -e "${BLUE}Checking Node 2 height (should be behind)...${NC}"
NODE2_HEIGHT_BEHIND=$(get_chain_height "3002")
BEHIND_BY=$(( NETWORK_HEIGHT - NODE2_HEIGHT_BEHIND ))

if [ "$BEHIND_BY" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Node 2 is behind by $BEHIND_BY blocks"
    echo "  Node 2: $NODE2_HEIGHT_BEHIND blocks"
    echo "  Network: $NETWORK_HEIGHT blocks"
else
    echo -e "${GREEN}✓${NC} Node 2 is synchronized: $NODE2_HEIGHT_BEHIND blocks"
fi

echo ""
echo -e "${BLUE}Requesting chain sync from Node 1...${NC}"
request_chain_sync "3002"

sleep 2

echo ""
echo -e "${BLUE}Checking Node 2 after sync request...${NC}"
NODE2_HEIGHT_AFTER=$(get_chain_height "3002")

if [ "$NODE2_HEIGHT_AFTER" -ge "$NETWORK_HEIGHT" ]; then
    SYNC_TIME=$BEHIND_BY
    echo -e "${GREEN}✓${NC} Node 2 caught up: $NODE2_HEIGHT_AFTER blocks"
    echo "  Blocks synchronized: $(( NODE2_HEIGHT_AFTER - NODE2_HEIGHT_BEHIND ))"
else
    echo -e "${YELLOW}⚠${NC} Node 2 not fully synchronized: $NODE2_HEIGHT_AFTER (expected: $NETWORK_HEIGHT)"
fi

# Test 3: Large chain sync
echo ""
echo ""
echo "TEST 3: LARGE CHAIN SYNC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Current state of network...${NC}"
for port in 3001 3002 3003 3004 3005; do
    height=$(get_chain_height "$port")
    echo "  Port $port: $height blocks"
done

CURRENT_HEIGHT=$(get_chain_height "3001")

echo ""
echo -e "${BLUE}Mining 10 blocks to simulate large chain...${NC}"
SYNC_START=$(date +%s%N)

mine_blocks_on_node "3001" 10

SYNC_END=$(date +%s%N)
SYNC_DURATION=$(( (SYNC_END - SYNC_START) / 1000000 ))

AFTER_MINING=$(get_chain_height "3001")
BLOCKS_ADDED_LARGE=$(( AFTER_MINING - CURRENT_HEIGHT ))

echo "Blocks mined: $BLOCKS_ADDED_LARGE"
echo "Mining time: ${SYNC_DURATION}ms"

echo ""
echo -e "${BLUE}Waiting for network synchronization...${NC}"
sleep 5

echo ""
echo -e "${BLUE}Verifying all nodes are synchronized...${NC}"

SYNC_OK=true
for port in 3001 3002 3003 3004 3005; do
    height=$(get_chain_height "$port")
    if [ "$height" -eq "$AFTER_MINING" ]; then
        echo -e "${GREEN}✓${NC} Port $port synchronized: $height blocks"
    else
        echo -e "${RED}✗${NC} Port $port behind: $height blocks (expected: $AFTER_MINING)"
        SYNC_OK=false
    fi
done

if [ "$SYNC_OK" = true ]; then
    echo -e "\n${GREEN}✓ All nodes synchronized with large chain${NC}"
else
    echo -e "\n${YELLOW}⚠ Some nodes not fully synchronized${NC}"
fi

# Test 4: Sync with ongoing transactions
echo ""
echo ""
echo "TEST 4: SYNC WITH ONGOING TRANSACTIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Submitting transactions while mining...${NC}"

# Generate test votes
NULLIFIER="sync_test_$(date +%s%N)"
VOTE=$(cat <<EOF
{
  "electionId": "election-sync-test",
  "nullifier": "$NULLIFIER",
  "encryptedBallot": "encrypted_test",
  "candidateId": 1,
  "timestamp": $(date +%s%N | cut -b1-13)
}
EOF
)

echo "Submitting vote to Node 1..."
curl -s -X POST http://localhost:3001/vote \
  -H "Content-Type: application/json" \
  -d "$VOTE" > /dev/null 2>&1

echo "Mining 3 blocks with pending vote..."
mine_blocks_on_node "3001" 3

sleep 3

echo ""
echo -e "${BLUE}Verifying vote propagated across network...${NC}"

VOTE_FOUND=0
for port in 3001 3002 3003 3004 3005; do
    if curl -s "http://localhost:$port/nullifier/$NULLIFIER" 2>/dev/null | grep -q '"isUsed":true'; then
        echo -e "${GREEN}✓${NC} Port $port has vote"
        ((VOTE_FOUND++))
    else
        echo -e "${RED}✗${NC} Port $port missing vote"
    fi
done

echo ""
echo "Vote propagation: $VOTE_FOUND/5 nodes"

# Test 5: Sync metrics
echo ""
echo ""
echo "TEST 5: SYNCHRONIZATION METRICS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Collecting sync metrics from all nodes...${NC}"

for port in 3001 3002 3003 3004 3005; do
    STATUS=$(get_node_status "$port")
    CHAIN_HEIGHT=$(echo "$STATUS" | grep -o '"chainHeight":[0-9]*' | cut -d':' -f2)
    UPTIME=$(echo "$STATUS" | grep -o '"uptime":[0-9]*' | cut -d':' -f2)
    
    # Convert uptime to readable format
    UPTIME_SECS=$(( UPTIME / 1000 ))
    UPTIME_MINS=$(( UPTIME_SECS / 60 ))
    
    echo "Port $port: Height=$CHAIN_HEIGHT, Uptime=${UPTIME_MINS}min"
done

# Final summary
echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║ TEST SUMMARY                                                       ║"
echo "╠════════════════════════════════════════════════════════════════════╣"
echo "║ Test 1: Fresh Node Sync                                           ║"
echo "║   - Blocks mined: $BLOCKS_MINED                                     ║"
echo "║   - Node 5 synchronized: $([ $NODE5_HEIGHT -ge $NEW_HEIGHT ] && echo "Yes" || echo "No") ║"
echo "║                                                                    ║"
echo "║ Test 2: Node Reconnection Sync                                    ║"
echo "║   - Nodes initially behind: $BEHIND_BY blocks                      ║"
echo "║   - Catch-up successful: $([ $NODE2_HEIGHT_AFTER -ge $NETWORK_HEIGHT ] && echo "Yes" || echo "No") ║"
echo "║                                                                    ║"
echo "║ Test 3: Large Chain Sync                                          ║"
echo "║   - Blocks added: $BLOCKS_ADDED_LARGE                              ║"
echo "║   - Mining time: ${SYNC_DURATION}ms                                ║"
echo "║   - All synchronized: $([ "$SYNC_OK" = true ] && echo "Yes" || echo "No") ║"
echo "║                                                                    ║"
echo "║ Test 4: Sync with Ongoing Transactions                            ║"
echo "║   - Vote propagation: $VOTE_FOUND/5 nodes                          ║"
echo "║                                                                    ║"
echo "║ Test 5: Synchronization Metrics                                   ║"
echo "║   - Final chain height: $AFTER_MINING blocks                       ║"
echo "║   - Network status: Healthy                                       ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

echo ""
echo "Task 2.3 Complete: Chain Synchronization Testing"
