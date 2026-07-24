#!/bin/bash
# Initial system bootstrap: seeds admin account, validator nodes, and system config.
# Requires running stack with .env at project root.
# Usage: bash infra/scripts/docker-bootstrap.sh

set -e

COMPOSE_FILE="infra/docker/docker-compose.yml"
ENV_FILE=".env"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  System Bootstrap${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

if ! docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps | grep -q "voting-backend.*Up"; then
    echo -e "${RED}Error: Backend container is not running${NC}"
    echo "  docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d"
    exit 1
fi

echo "This will seed:"
echo "  - Admin user (ADMIN001 / admin123)"
echo "  - Validator nodes (3 validators + 1 observer)"
echo "  - System configuration"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ] && [ "$confirm" != "y" ]; then
    echo -e "${RED}Bootstrap cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Bootstrapping...${NC}"

if docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend test -f scripts/seed.js; then
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend node scripts/seed.js
else
    echo -e "${RED}Error: scripts/seed.js not found in backend container${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}Bootstrap complete${NC}"
echo -e "${GREEN}Login: ADMIN001 / admin123${NC}"
echo -e "${GREEN}===========================================${NC}"
