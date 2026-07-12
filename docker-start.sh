#!/bin/bash

# Docker Start Script for Voting System
# This script helps you start the entire voting system with Docker

set -e

echo "=========================================="
echo "🗳️  University Blockchain Voting System"
echo "🐳 Docker Quick Start Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed!${NC}"
    echo "Please install Docker Compose"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running!${NC}"
    echo "Please start Docker Desktop"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed and running${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env and update the JWT_SECRET and passwords!${NC}"
        echo ""
    else
        echo -e "${RED}❌ .env.example not found!${NC}"
        exit 1
    fi
fi

# Ask user what to do
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
        echo -e "${GREEN}🚀 Building and starting all services...${NC}"
        echo "This may take 5-10 minutes on first run..."
        echo ""
        docker-compose up --build -d
        echo ""
        echo -e "${GREEN}✅ All services started!${NC}"
        echo ""
        echo "Services are now running:"
        echo "  - Frontend:     http://localhost:5173"
        echo "  - Admin Panel:  http://localhost:5174"
        echo "  - Backend API:  http://localhost:3000"
        echo "  - Blockchain:   http://localhost:3001"
        echo "  - phpMyAdmin:   http://localhost:8080"
        echo ""
        echo -e "${BLUE}🌱 Seeding database with test data...${NC}"
        sleep 10
        docker-compose exec backend npm run db:seed
        echo -e "${GREEN}✅ Database seeded!${NC}"
        echo ""
        echo "View logs with: docker-compose logs -f"
        ;;
    2)
        echo ""
        echo -e "${GREEN}🚀 Starting all services...${NC}"
        docker-compose up -d
        echo ""
        echo -e "${GREEN}✅ All services started!${NC}"
        echo ""
        echo "Services are now running:"
        echo "  - Frontend:     http://localhost:5173"
        echo "  - Admin Panel:  http://localhost:5174"
        echo "  - Backend API:  http://localhost:3000"
        echo "  - Blockchain:   http://localhost:3001"
        echo "  - phpMyAdmin:   http://localhost:8080"
        ;;
    3)
        echo ""
        echo -e "${YELLOW}🛑 Stopping all services...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ All services stopped!${NC}"
        ;;
    4)
        echo ""
        echo -e "${GREEN}📋 Viewing logs (Ctrl+C to exit)...${NC}"
        echo ""
        docker-compose logs -f
        ;;
    5)
        echo ""
        echo -e "${YELLOW}🔄 Restarting all services...${NC}"
        docker-compose restart
        echo -e "${GREEN}✅ All services restarted!${NC}"
        ;;
    6)
        echo ""
        echo -e "${RED}⚠️  WARNING: This will delete all data (database, blockchain, etc.)${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo ""
            echo -e "${YELLOW}🧹 Cleaning up...${NC}"
            docker-compose down -v
            echo -e "${GREEN}✅ Cleanup complete!${NC}"
        else
            echo "Cancelled."
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "For more commands, see DOCKER_SETUP.md"
echo "=========================================="
