#!/bin/bash

# Multi-Node Network Verification Script
# Reads ports from .env (BLOCKCHAIN_NODE1_PORT–BLOCKCHAIN_NODE5_PORT).

set -e

echo "╔════════════════════════════════════════════╗"
echo "║  Multi-Node Network Verification           ║"
echo "╚════════════════════════════════════════════╝"

get_env() {
  local var="$1" fallback="$2"
  local val
  val=$(grep "^${var}=" .env 2>/dev/null | head -1 | cut -d= -f2-)
  echo "${val:-$fallback}"
}

N1=$(get_env BLOCKCHAIN_NODE1_PORT 3001)
N2=$(get_env BLOCKCHAIN_NODE2_PORT 3002)
N3=$(get_env BLOCKCHAIN_NODE3_PORT 3003)
N4=$(get_env BLOCKCHAIN_NODE4_PORT 3004)
N5=$(get_env BLOCKCHAIN_NODE5_PORT 3005)
NODES=("$N1" "$N2" "$N3" "$N4" "$N5")
VALIDATOR_PORTS=("$N1" "$N2" "$N3")
OBSERVER_PORTS=("$N4" "$N5")

FAILED=0
PASSED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

_http_get() {
  if command -v curl &>/dev/null; then
    curl -s "$1"
  elif command -v wget &>/dev/null; then
    wget -q -O - "$1" 2>/dev/null
  fi
}

echo ""
echo "1. CHECKING NODE CONNECTIVITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for port in "${NODES[@]}"; do
    if _http_get "http://localhost:$port/node/status" > /dev/null 2>&1; then
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

for port in "${VALIDATOR_PORTS[@]}"; do
    node_type=$(_http_get "http://localhost:$port/node/status" | grep -o '"nodeType":"[^"]*"' | cut -d'"' -f4)
    if [ "$node_type" = "validator" ]; then
        echo -e "${GREEN}✓${NC} Node on port $port is a validator"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Node on port $port is not a validator (got: $node_type)"
        ((FAILED++))
    fi
done

for port in "${OBSERVER_PORTS[@]}"; do
    node_type=$(_http_get "http://localhost:$port/node/status" | grep -o '"nodeType":"[^"]*"' | cut -d'"' -f4)
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

network_status=$(_http_get "http://localhost:$N1/network/status")
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
    chain_length=$(_http_get "http://localhost:$port/chain" | grep -o '"length":[0-9]*' | cut -d':' -f2)
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
