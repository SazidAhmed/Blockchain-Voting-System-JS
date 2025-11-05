#!/bin/bash

# ==========================================
# Docker Restore Script for Voting System
# ==========================================
# This script restores MySQL database and blockchain data from backup

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Voting System Restore Utility${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No backup file specified!${NC}"
    echo ""
    echo "Usage: $0 <backup-file.tar.gz>"
    echo ""
    echo -e "${BLUE}Available backups:${NC}"
    ls -lh ./backups/*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Confirm restoration
echo -e "${YELLOW}WARNING: This will restore data from backup and overwrite current data!${NC}"
echo -e "Backup file: ${BACKUP_FILE}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Restore cancelled.${NC}"
    exit 0
fi

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}Extracting backup archive...${NC}"
tar xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find the backup files
BACKUP_NAME=$(basename "${BACKUP_FILE}" .tar.gz)
MYSQL_BACKUP="${TEMP_DIR}/${BACKUP_NAME}_mysql.sql"
BLOCKCHAIN_BACKUP="${TEMP_DIR}/${BACKUP_NAME}_blockchain.tar.gz"
ENV_BACKUP="${TEMP_DIR}/${BACKUP_NAME}_env.txt"

# Check if containers are running
echo -e "${YELLOW}Checking if containers are running...${NC}"
if ! docker-compose ps | grep -q "voting-mysql.*Up"; then
    echo -e "${YELLOW}MySQL container is not running. Starting services...${NC}"
    docker-compose up -d mysql
    echo "Waiting for MySQL to be ready..."
    sleep 10
fi

# Restore MySQL database
echo -e "${BLUE}Restoring MySQL database...${NC}"
docker-compose exec -T mysql mysql -u voting_user -pvoting_pass voting_db < "${MYSQL_BACKUP}"
echo -e "${GREEN}✓ MySQL database restored successfully${NC}"

# Restore blockchain data
echo -e "${BLUE}Restoring blockchain data...${NC}"
docker-compose stop blockchain-node
docker-compose exec -T blockchain-node rm -rf /app/data/*
cat "${BLOCKCHAIN_BACKUP}" | docker-compose exec -T blockchain-node tar xzf - -C /
docker-compose start blockchain-node
echo -e "${GREEN}✓ Blockchain data restored successfully${NC}"

# Show environment differences (optional)
if [ -f "${ENV_BACKUP}" ] && [ -f ".env" ]; then
    echo -e "${BLUE}Checking environment differences...${NC}"
    if diff -q .env "${ENV_BACKUP}" > /dev/null; then
        echo -e "${GREEN}✓ Environment configuration unchanged${NC}"
    else
        echo -e "${YELLOW}! Environment configuration differs from backup${NC}"
        echo -e "${YELLOW}  Backup saved at: ${ENV_BACKUP}${NC}"
        echo -e "${YELLOW}  You may need to review changes manually${NC}"
    fi
fi

# Cleanup
rm -rf "${TEMP_DIR}"

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}Restore completed successfully!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${BLUE}Restarting all services...${NC}"
docker-compose restart

echo ""
echo -e "${GREEN}All services restarted. System is ready!${NC}"
echo ""
