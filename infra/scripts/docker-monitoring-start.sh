#!/bin/bash

# ==========================================
# Start Monitoring Stack
# ==========================================

set -e

# Docker Compose file locations (relative to project root)
COMPOSE_FILE="infra/docker/docker-compose.yml"
COMPOSE_MONITORING_FILE="infra/docker/docker-compose.monitoring.yml"
ENV_FILE=".env"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Starting Monitoring Stack${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check if main services are running
echo -e "${YELLOW}Checking if voting system services are running...${NC}"
if ! docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps | grep -q "voting-mysql.*Up"; then
    echo -e "${YELLOW}Main services are not running. Starting them first...${NC}"
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    echo "Waiting for services to be ready..."
    sleep 10
fi

echo -e "${GREEN}✓ Main services are running${NC}"
echo ""

# Start monitoring stack
echo -e "${BLUE}Starting monitoring services...${NC}"
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE -f $COMPOSE_MONITORING_FILE --env-file $ENV_FILE up -d

echo ""
echo -e "${BLUE}Waiting for services to initialize...${NC}"
sleep 5

# Check status
echo ""
echo -e "${BLUE}Monitoring stack status:${NC}"
docker-compose -f $COMPOSE_MONITORING_FILE --env-file $ENV_FILE ps

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}Monitoring stack started successfully!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${BLUE}Access the monitoring tools:${NC}"
echo -e "  📊 Grafana:    http://localhost:3030 (admin/admin)"
echo -e "  📈 Prometheus: http://localhost:9090"
echo -e "  🐳 cAdvisor:   http://localhost:8081"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  View logs:      docker-compose -f $COMPOSE_MONITORING_FILE --env-file $ENV_FILE logs -f"
echo -e "  Stop monitoring: docker-compose -f $COMPOSE_MONITORING_FILE --env-file $ENV_FILE down"
echo -e "  Restart:        docker-compose -f $COMPOSE_MONITORING_FILE --env-file $ENV_FILE restart"
echo ""
echo -e "${BLUE}Dashboard Info:${NC}"
echo -e "  • Pre-configured dashboards are available in Grafana"
echo -e "  • Navigate to Dashboards > Voting System folder"
echo -e "  • Metrics are collected every 15 seconds"
echo -e "  • Data retention: 30 days"
echo ""
