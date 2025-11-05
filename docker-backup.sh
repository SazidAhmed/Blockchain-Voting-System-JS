#!/bin/bash

# ==========================================
# Docker Backup Script for Voting System
# ==========================================
# This script backs up MySQL database and blockchain data

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="voting_backup_${TIMESTAMP}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Voting System Backup Utility${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Check if containers are running
echo -e "${YELLOW}Checking if containers are running...${NC}"
if ! docker-compose ps | grep -q "voting-mysql.*Up"; then
    echo -e "${RED}Error: MySQL container is not running!${NC}"
    echo "Please start the services first: docker-compose up -d"
    exit 1
fi

# Backup MySQL database
echo -e "${BLUE}Backing up MySQL database...${NC}"
docker-compose exec -T mysql mysqldump -u voting_user -pvoting_pass voting_db > "${BACKUP_DIR}/${BACKUP_NAME}_mysql.sql"
echo -e "${GREEN}✓ MySQL backup saved to: ${BACKUP_DIR}/${BACKUP_NAME}_mysql.sql${NC}"

# Backup blockchain data
echo -e "${BLUE}Backing up blockchain data...${NC}"
docker-compose exec -T blockchain-node tar czf - /app/data > "${BACKUP_DIR}/${BACKUP_NAME}_blockchain.tar.gz"
echo -e "${GREEN}✓ Blockchain backup saved to: ${BACKUP_DIR}/${BACKUP_NAME}_blockchain.tar.gz${NC}"

# Backup environment file
echo -e "${BLUE}Backing up environment configuration...${NC}"
cp .env "${BACKUP_DIR}/${BACKUP_NAME}_env.txt"
echo -e "${GREEN}✓ Environment backup saved to: ${BACKUP_DIR}/${BACKUP_NAME}_env.txt${NC}"

# Create backup metadata
cat > "${BACKUP_DIR}/${BACKUP_NAME}_metadata.txt" << EOF
Backup Created: $(date)
MySQL Backup: ${BACKUP_NAME}_mysql.sql
Blockchain Backup: ${BACKUP_NAME}_blockchain.tar.gz
Environment Backup: ${BACKUP_NAME}_env.txt

Docker Compose Version: $(docker-compose version --short)
Docker Version: $(docker version --format '{{.Server.Version}}')

Service Versions:
$(docker-compose ps --format json | jq -r '.[] | "  \(.Service): \(.State)"')
EOF

echo -e "${GREEN}✓ Metadata saved to: ${BACKUP_DIR}/${BACKUP_NAME}_metadata.txt${NC}"

# Create compressed archive
echo -e "${BLUE}Creating compressed backup archive...${NC}"
cd "${BACKUP_DIR}"
tar czf "${BACKUP_NAME}.tar.gz" \
    "${BACKUP_NAME}_mysql.sql" \
    "${BACKUP_NAME}_blockchain.tar.gz" \
    "${BACKUP_NAME}_env.txt" \
    "${BACKUP_NAME}_metadata.txt"

# Remove individual files
rm -f "${BACKUP_NAME}_mysql.sql" \
      "${BACKUP_NAME}_blockchain.tar.gz" \
      "${BACKUP_NAME}_env.txt" \
      "${BACKUP_NAME}_metadata.txt"

cd ..

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}Backup completed successfully!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo -e "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo -e "Backup size: ${BACKUP_SIZE}"
echo ""
echo -e "${YELLOW}To restore this backup, run:${NC}"
echo -e "  ./docker-restore.sh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""

# List all backups
echo -e "${BLUE}Available backups:${NC}"
ls -lh "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
