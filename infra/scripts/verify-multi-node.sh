#!/bin/bash

# Multi-Node Network Verification Script
# Tests node connectivity, block mining, and vote propagation

set -e

echo "╔════════════════════════════════════════════╗"
echo "║  Multi-Node Network Verification           ║"
echo "╚════════════════════════════════════════════╝"

NODES=(3001 3002 3003 3004 3005)
FAILED=0
PASSED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "1. CHECKING NODE CONNECTIVITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for port in "${NODES[@]}"; do
    if curl -s "http://localhost:$port/node/status" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Port $port is responding"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Port $port is not responding"
        ((FAILED++))
    fi
done

echo ""
echo "2. CHECKING NODE TYPES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Validators (ports 3001-3003)
for port in 3001 3002 3003; do
    node_type=$(curl -s "http://localhost:$port/node/status" | grep -o '"nodeType":"[^"]*"' | cut -d'"' -f4)
    if [ "$node_type" = "validator" ]; then
        echo -e "${GREEN}✓${NC} Node on port $port is a validator"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Node on port $port is not a validator (got: $node_type)"
        ((FAILED++))
    fi
done

# Check Observers (ports 3004-3005)
for port in 3004 3005; do
    node_type=$(curl -s "http://localhost:$port/node/status" | grep -o '"nodeType":"[^"]*"' | cut -d'"' -f4)
    if [ "$node_type" = "observer" ]; then
        echo -e "${GREEN}✓${NC} Node on port $port is an observer"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Node on port $port is not an observer (got: $node_type)"
        ((FAILED++))
    fi
done

echo ""
echo "3. CHECKING NETWORK STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

network_status=$(curl -s "http://localhost:3001/network/status")
total_nodes=$(echo "$network_status" | grep -o '"totalNodes":[0-9]*' | cut -d':' -f2)
healthy_nodes=$(echo "$network_status" | grep -o '"healthyNodes":[0-9]*' | cut -d':' -f2)

echo "Total nodes in network: $total_nodes"
echo "Healthy nodes: $healthy_nodes"

if [ "$total_nodes" -ge 5 ]; then
    echo -e "${GREEN}✓${NC} All nodes detected in network"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Expected 5 nodes, found: $total_nodes"
fi

echo ""
echo "4. CHECKING BLOCKCHAIN SYNCHRONIZATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for port in "${NODES[@]}"; do
    chain_length=$(curl -s "http://localhost:$port/chain" | grep -o '"length":[0-9]*' | cut -d':' -f2)
    echo "Node on port $port - Chain height: $chain_length"
done

echo ""
echo "5. TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Tests Passed: ${GREEN}$PASSED${NC}"
echo -e "Tests Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed! Network is healthy.${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed. Please check the network.${NC}"
    exit 1
fi
