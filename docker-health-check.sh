#!/bin/bash

# ==========================================
# Docker Health Check Script for Voting System
# ==========================================
# Comprehensive health check for all services

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

HEALTHY=0
UNHEALTHY=0

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Voting System Health Check${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check if Docker is running
echo -e "${BLUE}Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Check container status
echo -e "${BLUE}Checking container status...${NC}"
containers=$(docker-compose ps --format json 2>/dev/null | jq -r '. | "\(.Service)|\(.State)|\(.Health)"' 2>/dev/null || echo "")

if [ -z "$containers" ]; then
    echo -e "${RED}✗ No containers are running!${NC}"
    echo -e "${YELLOW}Run 'docker-compose up -d' to start services${NC}"
    exit 1
fi

while IFS='|' read -r service state health; do
    if [ -z "$service" ]; then continue; fi
    
    status_icon=""
    status_color="${GREEN}"
    
    if [ "$state" = "running" ]; then
        if [ "$health" = "healthy" ] || [ -z "$health" ]; then
            status_icon="✓"
            HEALTHY=$((HEALTHY + 1))
        else
            status_icon="✗"
            status_color="${RED}"
            UNHEALTHY=$((UNHEALTHY + 1))
        fi
    else
        status_icon="✗"
        status_color="${RED}"
        UNHEALTHY=$((UNHEALTHY + 1))
    fi
    
    printf "${status_color}${status_icon} %-20s %s %s${NC}\n" "$service" "$state" "$health"
done <<< "$containers"

echo ""

# Check service endpoints
echo -e "${BLUE}Checking service endpoints...${NC}"

# Check Backend API
if curl -sf http://localhost:3000/api/elections > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API responding (http://localhost:3000)${NC}"
    HEALTHY=$((HEALTHY + 1))
else
    echo -e "${RED}✗ Backend API not responding (http://localhost:3000)${NC}"
    UNHEALTHY=$((UNHEALTHY + 1))
fi

# Check Blockchain Node
if curl -sf http://localhost:3001/node > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Blockchain node responding (http://localhost:3001)${NC}"
    HEALTHY=$((HEALTHY + 1))
else
    echo -e "${RED}✗ Blockchain node not responding (http://localhost:3001)${NC}"
    UNHEALTHY=$((UNHEALTHY + 1))
fi

# Check Frontend
if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend responding (http://localhost:5173)${NC}"
    HEALTHY=$((HEALTHY + 1))
else
    echo -e "${RED}✗ Frontend not responding (http://localhost:5173)${NC}"
    UNHEALTHY=$((UNHEALTHY + 1))
fi

# Check phpMyAdmin
if curl -sf http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ phpMyAdmin responding (http://localhost:8080)${NC}"
    HEALTHY=$((HEALTHY + 1))
else
    echo -e "${RED}✗ phpMyAdmin not responding (http://localhost:8080)${NC}"
    UNHEALTHY=$((UNHEALTHY + 1))
fi

echo ""

# Check database connectivity
echo -e "${BLUE}Checking database connectivity...${NC}"
if docker-compose exec -T mysql mysql -u voting_user -pvoting_pass -e "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MySQL database accessible${NC}"
    HEALTHY=$((HEALTHY + 1))
else
    echo -e "${RED}✗ MySQL database not accessible${NC}"
    UNHEALTHY=$((UNHEALTHY + 1))
fi

echo ""

# Check resource usage
echo -e "${BLUE}Resource usage:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep voting | \
while IFS=$'\t' read -r name cpu mem; do
    echo -e "  ${name}: CPU ${cpu}, Memory ${mem}"
done

echo ""
echo -e "${BLUE}===========================================${NC}"

# Summary
if [ $UNHEALTHY -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! System is healthy.${NC}"
    echo -e "${GREEN}  Healthy checks: ${HEALTHY}${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed!${NC}"
    echo -e "${GREEN}  Healthy checks: ${HEALTHY}${NC}"
    echo -e "${RED}  Failed checks: ${UNHEALTHY}${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "  1. Check logs: ./docker-logs.sh"
    echo -e "  2. Restart services: docker-compose restart"
    echo -e "  3. View container status: docker-compose ps"
    exit 1
fi
