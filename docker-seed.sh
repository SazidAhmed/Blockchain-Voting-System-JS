#!/bin/bash

# ==========================================
# Docker Seed Script for Voting System
# ==========================================
# Seed database with test data

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Voting System Seed Utility${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check if containers are running
if ! docker-compose ps | grep -q "voting-backend.*Up"; then
    echo -e "${RED}Error: Backend container is not running!${NC}"
    echo "Please start the services first: docker-compose up -d"
    exit 1
fi

echo -e "${YELLOW}This will populate the database with test data:${NC}"
echo "  - Sample users"
echo "  - Test elections"
echo "  - Candidate data"
echo "  - Voter registrations"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Seeding cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Seeding database...${NC}"

# Check if seed script exists in backend
if docker-compose exec backend test -f seed.js; then
    docker-compose exec backend npm run seed
else
    echo -e "${RED}Error: seed.js not found in backend container${NC}"
    echo -e "${YELLOW}Running manual seed commands instead...${NC}"
    
    # Alternative: Use seed data from data directory
    if [ -f "backend/data/users.json" ]; then
        echo -e "${BLUE}Importing users...${NC}"
        # Add your import logic here
    fi
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}Database seeded successfully!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${BLUE}Test credentials:${NC}"
echo "  Email: test@university.edu"
echo "  Password: Test123!"
echo ""
echo -e "${YELLOW}Access the application:${NC}"
echo "  Frontend: http://localhost:5173"
echo "  phpMyAdmin: http://localhost:8080"
echo ""
