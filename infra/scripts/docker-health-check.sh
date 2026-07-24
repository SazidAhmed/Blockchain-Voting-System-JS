#!/bin/bash

# Comprehensive health check for all services
# Reads ports from .env so one source of truth.

set -e

# Docker Compose file location (relative to project root)
COMPOSE_FILE="infra/docker/docker-compose.yml"
ENV_FILE=".env"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

HEALTHY=0
UNHEALTHY=0

# Read a var from .env (or environment) with fallback
get_env() {
  local var="$1" fallback="$2"
  local val
  val=$(grep "^${var}=" .env 2>/dev/null | head -1 | cut -d= -f2-)
  echo "${val:-$fallback}"
}

BACKEND_PORT=$(get_env BACKEND_PORT 3000)
FRONTEND_PORT=$(get_env FRONTEND_PORT 5173)
ADMIN_PANEL_PORT=$(get_env ADMIN_PANEL_PORT 5174)
PMA_PORT=$(get_env PMA_HOST_PORT 8080)
MYSQL_USER=$(get_env MYSQL_USER voting_user)
MYSQL_PASSWORD=$(get_env MYSQL_PASSWORD voting_pass)

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
containers=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps --format json 2>/dev/null | jq -r '. | "\(.Service)|\(.State)|\(.Health)"' 2>/dev/null || echo "")

if [ -z "$containers" ]; then
    echo -e "${RED}✗ No containers are running!${NC}"
    echo -e "${YELLOW}Run 'docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d' to start services${NC}"
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

_endpoint_check() {
  local label="$1" url="$2"
  if command -v curl &>/dev/null; then
    curl -sf "$url" > /dev/null 2>&1
  elif command -v wget &>/dev/null; then
    wget -q --spider "$url" 2>/dev/null
  else
    echo -e "${YELLOW}⚠ curl/wget not found — skipping ${label}${NC}"
    return
  fi
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ${label} responding (${url})${NC}"
    HEALTHY=$((HEALTHY + 1))
  else
    echo -e "${RED}✗ ${label} not responding (${url})${NC}"
    UNHEALTHY=$((UNHEALTHY + 1))
  fi
}

_endpoint_check "Backend API"        "http://localhost:${BACKEND_PORT}/api/elections"
_endpoint_check "Frontend"           "http://localhost:${FRONTEND_PORT}"
_endpoint_check "Admin Panel"        "http://localhost:${ADMIN_PANEL_PORT}"
_endpoint_check "phpMyAdmin"         "http://localhost:${PMA_PORT}"

echo ""

# Check database connectivity
echo -e "${BLUE}Checking database connectivity...${NC}"
if docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T mysql mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" -e "SELECT 1" > /dev/null 2>&1; then
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
    echo -e "  1. Check logs: bash $(dirname "$0")/docker-logs.sh"
    echo -e "  2. Restart services: docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE restart"
    echo -e "  3. View container status: docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps"
    exit 1
fi
