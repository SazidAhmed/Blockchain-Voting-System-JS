#!/bin/bash

echo "========================================"
echo "🔗 PEER DISCOVERY & CONNECTIVITY TEST"
echo "========================================"
echo ""

# Test 1: Check peer discovery endpoint on each node
echo "TEST 1: Peer Discovery Status (Detailed)"
echo "========================================"
echo ""

for i in {1..5}; do
    PORT=$((3000 + $i))
    echo "Node $i (Port $PORT):"
    echo "-------------------"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:$PORT/peers/discovery-status 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    JSON_DATA=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        CONFIGURED=$(echo "$JSON_DATA" | grep -o '"configuredPeers":[0-9]*' | cut -d':' -f2)
        CONNECTED=$(echo "$JSON_DATA" | grep -o '"connectedPeers":[0-9]*' | cut -d':' -f2)
        HEALTHY=$(echo "$JSON_DATA" | grep -o '"healthyPeers":[0-9]*' | cut -d':' -f2)
        UNHEALTHY=$(echo "$JSON_DATA" | grep -o '"unhealthyPeers":[0-9]*' | cut -d':' -f2)
        
        echo "  ✅ Configured: $CONFIGURED peers"
        echo "     Connected: $CONNECTED peers"
        echo "     Healthy: $HEALTHY"
        echo "     Unhealthy: $UNHEALTHY"
    else
        echo "  ❌ Failed to reach peer discovery endpoint (HTTP $HTTP_CODE)"
    fi
    echo ""
done

# Test 2: Check /peers endpoint
echo "TEST 2: Peer Connection Statistics"
echo "==================================="
echo ""

for i in {1..5}; do
    PORT=$((3000 + $i))
    echo "Node $i (Port $PORT):"
    echo "-------------------"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:$PORT/peers 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    JSON_DATA=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        TOTAL=$(echo "$JSON_DATA" | grep -o '"totalPeers":[0-9]*' | cut -d':' -f2)
        HEALTHY=$(echo "$JSON_DATA" | grep -o '"healthyPeers":[0-9]*' | cut -d':' -f2)
        UNHEALTHY=$(echo "$JSON_DATA" | grep -o '"unhealthyPeers":[0-9]*' | cut -d':' -f2)
        
        echo "  Total Peers: $TOTAL"
        echo "  Healthy: $HEALTHY"
        echo "  Unhealthy: $UNHEALTHY"
        
        # Extract peer details if available
        PEERS=$(echo "$JSON_DATA" | grep -o '"peers":\[[^]]*\]' | head -c 200)
        if [ ! -z "$PEERS" ]; then
            echo "  Peer List (truncated): $PEERS..."
        fi
    else
        echo "  ❌ Failed to reach peers endpoint (HTTP $HTTP_CODE)"
    fi
    echo ""
done

# Test 3: Network connectivity test (ping between nodes)
echo "TEST 3: Direct Network Connectivity"
echo "==================================="
echo ""

for i in {1..5}; do
    PORT=$((3000 + $i))
    RESPONSE=$(curl -s http://localhost:$PORT/node/status 2>/dev/null | grep -o '"nodeId":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$RESPONSE" ]; then
        echo "✅ Node $i (Port $PORT) is reachable"
    else
        echo "❌ Node $i (Port $PORT) is NOT reachable"
    fi
done
echo ""

# Test 4: Chain synchronization check
echo "TEST 4: Chain Height Synchronization"
echo "===================================="
echo ""

for i in {1..5}; do
    PORT=$((3000 + $i))
    CHAIN_LENGTH=$(curl -s http://localhost:$PORT/chain 2>/dev/null | grep -o '"length":[0-9]*' | cut -d':' -f2)
    if [ ! -z "$CHAIN_LENGTH" ]; then
        echo "Node $i (Port $PORT): Chain length = $CHAIN_LENGTH blocks"
    fi
done
echo ""

echo "========================================"
echo "✅ PEER DISCOVERY TEST COMPLETE"
echo "========================================"
