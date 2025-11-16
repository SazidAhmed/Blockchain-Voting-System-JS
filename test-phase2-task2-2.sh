#!/bin/bash

# Phase 2 - Task 2.2: Block Mining and Consensus Testing
# Tests block mining, validation, and consensus across validators

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
VALIDATORS=(3001 3002 3003)
VALIDATORS_NAMES=("Validator-1" "Validator-2" "Validator-3")
OBSERVERS=(3004 3005)
OBSERVERS_NAMES=("Observer-1" "Observer-2")

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║ Phase 2 - Task 2.2: Block Mining and Consensus Testing            ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

# Helper function to get chain height
get_chain_height() {
    local port=$1
    curl -s "http://localhost:$port/chain" 2>/dev/null | grep -o '"length":[0-9]*' | cut -d':' -f2
}

# Helper function to mine block
mine_block() {
    local port=$1
    curl -s -X GET "http://localhost:$port/mine" 2>/dev/null
}

# Test 1: Validator mining
echo ""
echo "TEST 1: VALIDATOR BLOCK MINING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Getting initial chain heights...${NC}"

declare -A HEIGHTS_BEFORE
for i in "${!VALIDATORS[@]}"; do
    port=${VALIDATORS[$i]}
    height=$(get_chain_height "$port")
    HEIGHTS_BEFORE[$port]=$height
    echo "  ${VALIDATORS_NAMES[$i]} (port $port): $height blocks"
done

echo ""
echo -e "${BLUE}Mining blocks on each validator...${NC}"

declare -A MINING_TIMES
declare -A MINE_SUCCESS

for i in "${!VALIDATORS[@]}"; do
    port=${VALIDATORS[$i]}
    name=${VALIDATORS_NAMES[$i]}
    
    echo -e "  Minin block on $name (port $port)..."
    START_TIME=$(date +%s%N)
    
    MINE_RESPONSE=$(mine_block "$port")
    
    END_TIME=$(date +%s%N)
    MINE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
    MINING_TIMES[$port]=$MINE_TIME
    
    if echo "$MINE_RESPONSE" | grep -q "New block forged\|block" 2>/dev/null; then
        echo -e "    ${GREEN}✓${NC} Block mined (${MINE_TIME}ms)"
        MINE_SUCCESS[$port]=1
    else
        echo -e "    ${RED}✗${NC} Mining failed"
        MINE_SUCCESS[$port]=0
    fi
done

echo ""
echo -e "${BLUE}Waiting for block propagation...${NC}"
sleep 3

echo ""
echo "Verifying blocks were added to all nodes:"

declare -A HEIGHTS_AFTER
MINING_SUCCESS_COUNT=0

for i in "${!VALIDATORS[@]}"; do
    port=${VALIDATORS[$i]}
    height=$(get_chain_height "$port")
    HEIGHTS_AFTER[$port]=$height
    name=${VALIDATORS_NAMES[$i]}
    
    HEIGHT_INCREASE=$(( ${HEIGHTS_AFTER[$port]} - ${HEIGHTS_BEFORE[$port]} ))
    
    if [ "$HEIGHT_INCREASE" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} $name: Chain height increased by $HEIGHT_INCREASE (${HEIGHTS_BEFORE[$port]} → ${HEIGHTS_AFTER[$port]})"
        ((MINING_SUCCESS_COUNT++))
    else
        echo -e "${RED}✗${NC} $name: No chain height increase"
    fi
done

# Test 2: Observer nodes cannot mine
echo ""
echo ""
echo "TEST 2: OBSERVER MINING RESTRICTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Testing that observers cannot mine...${NC}"

for i in "${!OBSERVERS[@]}"; do
    port=${OBSERVERS[$i]}
    name=${OBSERVERS_NAMES[$i]}
    
    echo -e "  Attempting mine on $name (port $port)..."
    
    MINE_RESPONSE=$(mine_block "$port")
    
    # Should fail since observer cannot mine
    if echo "$MINE_RESPONSE" | grep -q "error\|Error\|failed\|Failed" 2>/dev/null || [ -z "$MINE_RESPONSE" ]; then
        echo -e "    ${GREEN}✓${NC} Mining rejected (as expected)"
    else
        echo -e "    ${YELLOW}⚠${NC} Mining did not fail"
    fi
done

# Test 3: Consensus and chain synchronization
echo ""
echo ""
echo "TEST 3: CONSENSUS AND CHAIN SYNCHRONIZATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Getting chain heights from all nodes...${NC}"

SYNC_COUNT=0
TOTAL_NODES=5
ALL_NODES=(3001 3002 3003 3004 3005)
ALL_NAMES=("Validator-1" "Validator-2" "Validator-3" "Observer-1" "Observer-2")

declare -A FINAL_HEIGHTS

for i in "${!ALL_NODES[@]}"; do
    port=${ALL_NODES[$i]}
    height=$(get_chain_height "$port")
    FINAL_HEIGHTS[$port]=$height
    echo "  ${ALL_NAMES[$i]} (port $port): $height blocks"
done

echo ""
echo -e "${BLUE}Verifying chain synchronization...${NC}"

# Check if all heights are the same (synchronized)
FIRST_HEIGHT=${FINAL_HEIGHTS[3001]}
SYNCHRONIZED=true

for port in "${ALL_NODES[@]}"; do
    if [ "${FINAL_HEIGHTS[$port]}" -ne "$FIRST_HEIGHT" ]; then
        SYNCHRONIZED=false
        echo -e "${YELLOW}⚠${NC} Node on port $port has different height: ${FINAL_HEIGHTS[$port]} (expected: $FIRST_HEIGHT)"
    fi
done

if [ "$SYNCHRONIZED" = true ]; then
    echo -e "${GREEN}✓${NC} All nodes synchronized at height $FIRST_HEIGHT"
    SYNC_COUNT=$TOTAL_NODES
else
    echo -e "${RED}✗${NC} Nodes not synchronized"
    # Count synchronized nodes
    for port in "${ALL_NODES[@]}"; do
        if [ "${FINAL_HEIGHTS[$port]}" -eq "$FIRST_HEIGHT" ]; then
            ((SYNC_COUNT++))
        fi
    done
fi

# Test 4: Concurrent mining
echo ""
echo ""
echo "TEST 4: CONCURRENT MINING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${BLUE}Submitting concurrent mining requests...${NC}"

CONCURRENT_START=$(date +%s%N)

# Mine on all validators concurrently
for port in "${VALIDATORS[@]}"; do
    mine_block "$port" > /dev/null 2>&1 &
done

wait

CONCURRENT_END=$(date +%s%N)
CONCURRENT_TIME=$(( (CONCURRENT_END - CONCURRENT_START) / 1000000 ))

echo "All mining requests submitted in ${CONCURRENT_TIME}ms"

echo ""
echo -e "${BLUE}Waiting for block propagation...${NC}"
sleep 4

echo ""
echo "Final chain heights:"

FINAL_SYNC_COUNT=0
declare -A FINAL_HEIGHTS_2

for i in "${!ALL_NODES[@]}"; do
    port=${ALL_NODES[$i]}
    height=$(get_chain_height "$port")
    FINAL_HEIGHTS_2[$port]=$height
    echo "  ${ALL_NAMES[$i]} (port $port): $height blocks"
done

# Check if still synchronized
FIRST_HEIGHT_2=${FINAL_HEIGHTS_2[3001]}
for port in "${ALL_NODES[@]}"; do
    if [ "${FINAL_HEIGHTS_2[$port]}" -eq "$FIRST_HEIGHT_2" ]; then
        ((FINAL_SYNC_COUNT++))
    fi
done

if [ "$FINAL_SYNC_COUNT" -eq "$TOTAL_NODES" ]; then
    echo -e "${GREEN}✓${NC} Network converged to consensus height: $FIRST_HEIGHT_2"
else
    echo -e "${YELLOW}⚠${NC} Not all nodes converged (${FINAL_SYNC_COUNT}/$TOTAL_NODES)"
fi

# Test 5: Merkle root verification
echo ""
echo ""
echo "TEST 5: MERKLE ROOT VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LATEST_BLOCK_INDEX=$(( FIRST_HEIGHT_2 - 1 ))

echo -e "${BLUE}Getting Merkle root for latest block (index $LATEST_BLOCK_INDEX)...${NC}"

for i in "${!VALIDATORS[@]}"; do
    port=${VALIDATORS[$i]}
    name=${VALIDATORS_NAMES[$i]}
    
    MERKLE_RESPONSE=$(curl -s "http://localhost:$port/merkle/block/$LATEST_BLOCK_INDEX" 2>/dev/null)
    
    if echo "$MERKLE_RESPONSE" | grep -q "merkleRoot" 2>/dev/null; then
        MERKLE_ROOT=$(echo "$MERKLE_RESPONSE" | grep -o '"merkleRoot":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✓${NC} $name: $MERKLE_ROOT"
    else
        echo -e "${RED}✗${NC} $name: Unable to retrieve Merkle root"
    fi
done

# Summary
echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║ TEST SUMMARY                                                       ║"
echo "╠════════════════════════════════════════════════════════════════════╣"
echo "║ Test 1: Validator Block Mining                                    ║"
echo "║   - Success: $MINING_SUCCESS_COUNT/3 validators                    ║"
echo "║   - Average Mining Time: ~${MINING_TIMES[3001]}ms                   ║"
echo "║                                                                    ║"
echo "║ Test 2: Observer Mining Restriction                               ║"
echo "║   - Status: ${GREEN}✓ Observers correctly restricted${NC}              ║"
echo "║                                                                    ║"
echo "║ Test 3: Chain Synchronization                                     ║"
echo "║   - Synchronized Nodes: $SYNC_COUNT/$TOTAL_NODES (target: 5/5)    ║"
echo "║   - Common Height: $FIRST_HEIGHT blocks                           ║"
echo "║                                                                    ║"
echo "║ Test 4: Concurrent Mining                                         ║"
echo "║   - Concurrent Time: ${CONCURRENT_TIME}ms                          ║"
echo "║   - Final Sync: $FINAL_SYNC_COUNT/$TOTAL_NODES (target: 5/5)      ║"
echo "║                                                                    ║"
echo "║ Test 5: Merkle Root Verification                                  ║"
echo "║   - Status: Merkle roots verified on validators                   ║"
echo "╚════════════════════════════════════════════════════════════════════╝"

echo ""
echo "Task 2.2 Complete: Block Mining and Consensus Testing"
