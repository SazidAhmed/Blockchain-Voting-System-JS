#!/bin/bash

# Start Multi-Node Blockchain Network
# Reads ports from .env (BLOCKCHAIN_NODE1_PORT–BLOCKCHAIN_NODE5_PORT).

set -e

COMPOSE_FILE_MULTI="infra/docker/docker-compose.multi-node.yml"
ENV_FILE=".env"

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

echo "╔════════════════════════════════════════════╗"
echo "║  Starting Multi-Node Blockchain Network    ║"
echo "╚════════════════════════════════════════════╝"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed"
    exit 1
fi

# Check if docker-compose.multi-node.yml exists
if [ ! -f "$COMPOSE_FILE_MULTI" ]; then
    echo "Error: $COMPOSE_FILE_MULTI not found"
    exit 1
fi

echo ""
echo "Starting 5 blockchain nodes..."
echo "  - Node 1 (Validator) - Port $N1"
echo "  - Node 2 (Validator) - Port $N2"
echo "  - Node 3 (Validator) - Port $N3"
echo "  - Node 4 (Observer)  - Port $N4"
echo "  - Node 5 (Observer)  - Port $N5"
echo ""

docker-compose -f $COMPOSE_FILE_MULTI --env-file $ENV_FILE up -d

echo ""
echo "✓ Starting nodes..."
echo ""
echo "Waiting for nodes to be healthy (this may take 30-60 seconds)..."
sleep 10

echo ""
echo "Checking node status..."

HEALTHY=0
for port in "${NODES[@]}"; do
    if command -v curl &>/dev/null && curl -s "http://localhost:$port/node/status" > /dev/null 2>&1; then
        echo "✓ Node on port $port is responding"
        ((HEALTHY++))
    elif command -v wget &>/dev/null && wget -q --spider "http://localhost:$port/node/status" 2>/dev/null; then
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
echo "║  Network URL: http://localhost:$N1          ║"
echo "╚════════════════════════════════════════════╝"

echo ""
echo "To check node status:"
echo "  curl http://localhost:$N1/node/status"
echo ""
echo "To check network status:"
echo "  curl http://localhost:$N1/network/status"
echo ""
echo "To view logs:"
echo "  docker-compose -f $COMPOSE_FILE_MULTI --env-file $ENV_FILE logs -f"
echo ""
echo "To stop the network:"
echo "  docker-compose -f $COMPOSE_FILE_MULTI --env-file $ENV_FILE down"
echo ""
