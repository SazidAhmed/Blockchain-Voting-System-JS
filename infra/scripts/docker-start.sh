#!/bin/bash

# Interactive script to manage the Docker voting system stack.
# Reads ports from .env for accurate display.

set -e

COMPOSE_FILE="infra/docker/docker-compose.yml"
ENV_FILE=".env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

get_env() {
  local var="$1" fallback="$2"
  local val
  val=$(grep "^${var}=" .env 2>/dev/null | head -1 | cut -d= -f2-)
  echo "${val:-$fallback}"
}

BACKEND_PORT=$(get_env BACKEND_PORT 3000)
FRONTEND_PORT=$(get_env FRONTEND_PORT 5173)
ADMIN_PORT=$(get_env ADMIN_PANEL_PORT 5174)
BC_PORT=$(get_env BLOCKCHAIN_NODE1_PORT 3001)
PMA_PORT=$(get_env PMA_HOST_PORT 8080)

echo "=========================================="
echo "  University Blockchain Voting System"
echo "  Docker Quick Start Script"
echo "=========================================="
echo ""

if ! command -v docker &> /dev/null; then
    echo -e "${RED} Docker is not installed!${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED} Docker Compose is not installed!${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED} Docker daemon is not running!${NC}"
    echo "Please start Docker Desktop"
    exit 1
fi

echo -e "${GREEN} Docker is installed and running${NC}"
echo ""

if [ ! -f .env ]; then
    echo -e "${YELLOW} .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN} .env file created${NC}"
    else
        echo -e "${RED} .env.example not found!${NC}"
        exit 1
    fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/generate-secrets.sh" ]; then
    bash "$SCRIPT_DIR/generate-secrets.sh" .env
fi

echo "What would you like to do?"
echo "1) Start all services (first time)"
echo "2) Start all services (already built)"
echo "3) Stop all services"
echo "4) View logs"
echo "5) Restart services"
echo "6) Clean up (remove containers and volumes)"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN} Building and starting all services...${NC}"
        echo ""
        docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up --build -d
        echo ""
        echo -e "${GREEN} All services started!${NC}"
        echo ""
        echo "Services are now running:"
        echo "  - Frontend:     http://localhost:${FRONTEND_PORT}"
        echo "  - Admin Panel:  http://localhost:${ADMIN_PORT}"
        echo "  - Backend API:  http://localhost:${BACKEND_PORT}"
        echo "  - Blockchain:   http://localhost:${BC_PORT}"
        echo "  - phpMyAdmin:   http://localhost:${PMA_PORT}"
        echo ""
        echo "View logs with: docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
        ;;
    2)
        echo ""
        echo -e "${GREEN} Starting all services...${NC}"
        docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
        echo ""
        echo -e "${GREEN} All services started!${NC}"
        echo ""
        echo "Services are now running:"
        echo "  - Frontend:     http://localhost:${FRONTEND_PORT}"
        echo "  - Admin Panel:  http://localhost:${ADMIN_PORT}"
        echo "  - Backend API:  http://localhost:${BACKEND_PORT}"
        echo "  - Blockchain:   http://localhost:${BC_PORT}"
        echo "  - phpMyAdmin:   http://localhost:${PMA_PORT}"
        ;;
    3)
        echo ""
        echo -e "${YELLOW} Stopping all services...${NC}"
        docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE down
        echo -e "${GREEN} All services stopped!${NC}"
        ;;
    4)
        echo ""
        echo -e "${GREEN} Viewing logs (Ctrl+C to exit)...${NC}"
        echo ""
        docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f
        ;;
    5)
        echo ""
        echo -e "${YELLOW} Restarting all services...${NC}"
        docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE restart
        echo -e "${GREEN} All services restarted!${NC}"
        ;;
    6)
        echo ""
        echo -e "${RED} WARNING: This will delete all data (database, blockchain, etc.)${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo ""
            echo -e "${YELLOW} Cleaning up...${NC}"
            docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE down -v
            echo -e "${GREEN} Cleanup complete!${NC}"
        else
            echo "Cancelled."
        fi
        ;;
    *)
        echo -e "${RED} Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "For more commands, see DOCKER_SETUP.md"
echo "=========================================="
