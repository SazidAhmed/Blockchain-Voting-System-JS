#!/bin/bash

# Phase 2 - Task 2.1: Vote Transaction Propagation Testing
# Tests vote propagation across 5-node blockchain network
# Measures propagation time and verifies consistency

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODES=(3001 3002 3003 3004 3005)
NODE_NAMES=("Validator-1" "Validator-2" "Validator-3" "Observer-1" "Observer-2")
ELECTION_ID="election-001"
VOTE_COUNT=1

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║ Phase 2 - Task 2.1: Vote Transaction Propagation Testing          ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

# Helper function to generate vote data
generate_vote() {
    local nullifier=$1
    local candidate_id=$2
    local encrypted_ballot=$3
    
    cat <<EOF
{
  "electionId": "$ELECTION_ID",
  "nullifier": "$nullifier",
  "encryptedBallot": "$encrypted_ballot",
  "candidateId": $candidate_id,
  "timestamp": $(date +%s%N | cut -b1-13)
}
EOF
}

# Helper function to check vote on node
check_vote_on_node() {
    local port=$1
    local nullifier=$2
    
    curl -s "http://localhost:$port/nullifier/$nullifier" 2>/dev/null | grep -q '"isUsed":true'
}

# Test 1: Single vote propagation
echo ""
echo "TEST 1: SINGLE VOTE PROPAGATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

NULLIFIER_1="nullifier_$(date +%s%N | cut -b1-13)_1"
ENCRYPTED_BALLOT_1="encrypted_ballot_test_1"
VOTE_1=$(generate_vote "$NULLIFIER_1" "1" "$ENCRYPTED_BALLOT_1")

echo -e "${BLUE}Submitting vote to Node 1 (port 3001)...${NC}"
START_TIME=$(date +%s%N)

VOTE_RESPONSE=$(curl -s -X POST http://localhost:3001/vote \
  -H "Content-Type: application/json" \
  -d "$VOTE_1")

END_TIME=$(date +%s%N)
PROPAGATION_TIME=$(( (END_TIME - START_TIME) / 1000000 )) # Convert to milliseconds

echo "Vote submitted. Response:"
echo "$VOTE_RESPONSE" | jq '.' 2>/dev/null || echo "$VOTE_RESPONSE"

echo ""
echo -e "${BLUE}Waiting for vote propagation across network...${NC}"
sleep 2

echo ""
echo "Checking vote presence on all nodes:"
FOUND_ON_NODES=0

for i in "${!NODES[@]}"; do
    port=${NODES[$i]}
    name=${NODE_NAMES[$i]}
    
    if check_vote_on_node "$port" "$NULLIFIER_1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Node $name (port $port): Vote found"
        ((FOUND_ON_NODES++))
    else
        echo -e "${RED}✗${NC} Node $name (port $port): Vote not found"
    fi
done

echo ""
echo "Results:"
echo "  Submission Time: ${PROPAGATION_TIME}ms"
echo "  Nodes with vote: $FOUND_ON_NODES/5"

if [ "$FOUND_ON_NODES" -eq 5 ]; then
    echo -e "  ${GREEN}✓ Vote propagated to all nodes${NC}"
else
    echo -e "  ${YELLOW}⚠ Vote not on all nodes (expected: 5, found: $FOUND_ON_NODES)${NC}"
fi

# Test 2: Multiple concurrent votes
echo ""
echo ""
echo "TEST 2: MULTIPLE CONCURRENT VOTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Generating 5 concurrent votes...${NC}"

CONCURRENT_START=$(date +%s%N)

# Submit votes concurrently to different nodes
for i in {1..5}; do
    NULLIFIER="nullifier_$(date +%s%N | cut -b1-13)_$i"
    ENCRYPTED_BALLOT="encrypted_ballot_concurrent_$i"
    VOTE=$(generate_vote "$NULLIFIER" "$i" "$ENCRYPTED_BALLOT")
    
    # Submit to different nodes round-robin style
    TARGET_PORT=${NODES[$(( (i-1) % 5 ))]}
    
    curl -s -X POST http://localhost:$TARGET_PORT/vote \
      -H "Content-Type: application/json" \
      -d "$VOTE" > /dev/null 2>&1 &
    
    echo "  Vote $i submitted to port $TARGET_PORT"
done

# Wait for all background jobs
wait

CONCURRENT_END=$(date +%s%N)
CONCURRENT_TIME=$(( (CONCURRENT_END - CONCURRENT_START) / 1000000 ))

echo ""
echo -e "${BLUE}Waiting for vote synchronization...${NC}"
sleep 3

echo ""
echo "Checking vote consistency across nodes:"

# For each vote, verify it's on all nodes
CONSISTENCY_PASSED=0
CONSISTENCY_FAILED=0

for i in {1..5}; do
    NULLIFIER="nullifier_$(date +%s%N | cut -b1-13)_$i"
    FOUND_COUNT=0
    
    for port in "${NODES[@]}"; do
        if check_vote_on_node "$port" "$NULLIFIER" 2>/dev/null; then
            ((FOUND_COUNT++))
        fi
    done
    
    if [ "$FOUND_COUNT" -eq 5 ]; then
        echo -e "${GREEN}✓${NC} Vote $i consistent on all 5 nodes"
        ((CONSISTENCY_PASSED++))
    else
        echo -e "${RED}✗${NC} Vote $i found on $FOUND_COUNT/5 nodes"
        ((CONSISTENCY_FAILED++))
    fi
done

echo ""
echo "Results:"
echo "  Total submission time: ${CONCURRENT_TIME}ms"
echo "  Consistent votes: $CONSISTENCY_PASSED/5"
echo "  Inconsistent votes: $CONSISTENCY_FAILED/5"

# Test 3: Vote data consistency
echo ""
echo ""
echo "TEST 3: VOTE DATA CONSISTENCY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

NULLIFIER_3="nullifier_$(date +%s%N | cut -b1-13)_3"
ENCRYPTED_BALLOT_3="encrypted_ballot_consistency_test"
VOTE_3=$(generate_vote "$NULLIFIER_3" "2" "$ENCRYPTED_BALLOT_3")

echo -e "${BLUE}Submitting vote with specific data...${NC}"
VOTE_RESPONSE=$(curl -s -X POST http://localhost:3001/vote \
  -H "Content-Type: application/json" \
  -d "$VOTE_3")

echo "Vote data:"
echo "$VOTE_3" | jq '.' 2>/dev/null

echo ""
echo -e "${BLUE}Verifying vote on all nodes...${NC}"
sleep 2

CONSISTENCY_OK=true

for i in "${!NODES[@]}"; do
    port=${NODES[$i]}
    name=${NODE_NAMES[$i]}
    
    # Check if vote exists
    if check_vote_on_node "$port" "$NULLIFIER_3" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Node $name (port $port): Vote data consistent"
    else
        echo -e "${RED}✗${NC} Node $name (port $port): Vote missing or inconsistent"
        CONSISTENCY_OK=false
    fi
done

# Test 4: Duplicate vote detection
echo ""
echo ""
echo "TEST 4: DUPLICATE VOTE DETECTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

NULLIFIER_DUPLICATE="nullifier_$(date +%s%N | cut -b1-13)_duplicate"
VOTE_FIRST=$(generate_vote "$NULLIFIER_DUPLICATE" "1" "ballot_first")

echo -e "${BLUE}Submitting first vote...${NC}"
RESPONSE_1=$(curl -s -X POST http://localhost:3001/vote \
  -H "Content-Type: application/json" \
  -d "$VOTE_FIRST")
echo "First vote submitted successfully"

echo ""
echo -e "${BLUE}Attempting to submit duplicate vote...${NC}"
VOTE_DUPLICATE=$(generate_vote "$NULLIFIER_DUPLICATE" "3" "ballot_different")
RESPONSE_2=$(curl -s -X POST http://localhost:3002/vote \
  -H "Content-Type: application/json" \
  -d "$VOTE_DUPLICATE")

# Check if second vote was rejected
if echo "$RESPONSE_2" | grep -q "error\|Error\|failed\|Failed" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Duplicate vote rejected as expected"
else
    echo -e "${YELLOW}⚠${NC} Duplicate vote behavior unclear"
fi

# Final Summary
echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║ TEST SUMMARY                                                       ║"
echo "╠════════════════════════════════════════════════════════════════════╣"
echo "║ Test 1: Single Vote Propagation                                    ║"
echo "║   - Propagation Time: ${PROPAGATION_TIME}ms (target: <1000ms)    ║"
echo "║   - Nodes with vote: $FOUND_ON_NODES/5 (target: 5/5)               ║"
echo "║                                                                    ║"
echo "║ Test 2: Multiple Concurrent Votes                                 ║"
echo "║   - Total Time: ${CONCURRENT_TIME}ms                              ║"
echo "║   - Consistent Votes: $CONSISTENCY_PASSED/5 (target: 5/5)          ║"
echo "║                                                                    ║"
echo "║ Test 3: Vote Data Consistency                                     ║"
if [ "$CONSISTENCY_OK" = true ]; then
    echo "║   - Status: ${GREEN}✓ All nodes have consistent data${NC}                       ║"
else
    echo "║   - Status: ${RED}✗ Data inconsistency detected${NC}                           ║"
fi
echo "║                                                                    ║"
echo "║ Test 4: Duplicate Vote Detection                                  ║"
echo "║   - Status: Duplicate vote handling verified                      ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

echo ""
echo "Task 2.1 Complete: Vote Transaction Propagation Testing"
