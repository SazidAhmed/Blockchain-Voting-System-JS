#!/bin/bash

# Start Multi-Node Blockchain Network
# This script starts a 5-node blockchain network (3 validators + 2 observers)

set -e

echo "╔════════════════════════════════════════════╗"
echo "║  Starting Multi-Node Blockchain Network    ║"
echo "╚════════════════════════════════════════════╝"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed"
    exit 1
fi

# Check if docker-compose.multi-node.yml exists
if [ ! -f "docker-compose.multi-node.yml" ]; then
    echo "Error: docker-compose.multi-node.yml not found in current directory"
    exit 1
fi

echo ""
echo "Starting 5 blockchain nodes..."
echo "  - Node 1 (Validator) - Port 3001"
echo "  - Node 2 (Validator) - Port 3002"
echo "  - Node 3 (Validator) - Port 3003"
echo "  - Node 4 (Observer) - Port 3004"
echo "  - Node 5 (Observer) - Port 3005"
echo ""

# Start the multi-node network
docker-compose -f docker-compose.multi-node.yml up -d

echo ""
echo "✓ Starting nodes..."
echo ""
echo "Waiting for nodes to be healthy (this may take 30-60 seconds)..."

# Wait for nodes to start
sleep 10

# Check node health
echo ""
echo "Checking node status..."

NODES=(3001 3002 3003 3004 3005)
HEALTHY=0

for port in "${NODES[@]}"; do
    if curl -s "http://localhost:$port/node/status" > /dev/null 2>&1; then
        echo "✓ Node on port $port is responding"
        ((HEALTHY++))
    else
        echo "⚠ Node on port $port is not yet responding"
    fi
done

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  Network Status                            ║"
echo "╠════════════════════════════════════════════╣"
echo "║  Healthy Nodes: $HEALTHY/5                              ║"
echo "║  Network URL: http://localhost:3001         ║"
echo "╚════════════════════════════════════════════╝"

echo ""
echo "To check node status:"
echo "  curl http://localhost:3001/node/status"
echo ""
echo "To check network status:"
echo "  curl http://localhost:3001/network/status"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.multi-node.yml logs -f"
echo ""
echo "To stop the network:"
echo "  docker-compose -f docker-compose.multi-node.yml down"
echo ""
