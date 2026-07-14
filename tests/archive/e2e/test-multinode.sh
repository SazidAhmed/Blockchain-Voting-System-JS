#!/bin/bash

# Multi-Node Blockchain Network Test
# Tests 5-node Byzantine Fault Tolerant network

echo "=========================================="
echo "MULTI-NODE BLOCKCHAIN NETWORK TEST"
echo "=========================================="
echo ""

# Test 1: Check all nodes are running
echo "📋 TEST 1: Node Status Check"
echo "----------------------------"
for i in {1..5}; do
  PORT=$((3000 + i))
  STATUS=$(curl -s http://localhost:$PORT/node 2>&1)
  if echo "$STATUS" | grep -q "nodeId"; then
    NODE_ID=$(echo "$STATUS" | grep -o '"nodeId":"[^"]*"' | cut -d'"' -f4)
    NODE_TYPE=$(echo "$STATUS" | grep -o '"nodeType":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Node $i - Port $PORT - ID: $NODE_ID - Type: $NODE_TYPE"
  else
    echo "❌ Node $i - Port $PORT - NOT RESPONDING"
  fi
done
echo ""

# Test 2: Check peer connectivity
echo "📋 TEST 2: Peer Connectivity"
echo "----------------------------"
for i in {1..5}; do
  PORT=$((3000 + i))
  PEERS=$(curl -s http://localhost:$PORT/node 2>&1 | grep -o '"peers":[0-9]*' | cut -d':' -f2)
  echo "Node $i (Port $PORT): $PEERS peers connected"
done
echo ""

# Test 3: Check validators
echo "📋 TEST 3: Validators List"
echo "---------------------------"
NODE1_VALIDATORS=$(curl -s http://localhost:3001/node 2>&1 | grep -o '"validators":\[[^]]*\]')
echo "Node 1 Validators: $NODE1_VALIDATORS"
echo ""

# Test 4: Full node status from each node
echo "📋 TEST 4: Full Node Information"
echo "--------------------------------"
for i in {1..3}; do
  PORT=$((3000 + i))
  echo "=== Node $i (Port $PORT) ==="
  curl -s http://localhost:$PORT/node 2>&1 | head -1
  echo ""
done

echo "=========================================="
echo "MULTI-NODE TEST COMPLETE"
echo "=========================================="
