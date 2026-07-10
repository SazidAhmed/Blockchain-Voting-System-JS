#!/bin/bash

# ==========================================
# Docker Cleanup Script for Voting System
# ==========================================
# Clean up old containers, images, volumes, and networks

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Docker Cleanup Utility${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

show_disk_usage() {
    echo -e "${BLUE}Current Docker disk usage:${NC}"
    docker system df
    echo ""
}

cleanup_stopped_containers() {
    echo -e "${YELLOW}Removing stopped containers...${NC}"
    removed=$(docker container prune -f 2>&1 | grep "Total reclaimed space" || echo "0B")
    echo -e "${GREEN}✓ ${removed}${NC}"
}

cleanup_unused_images() {
    echo -e "${YELLOW}Removing dangling images...${NC}"
    removed=$(docker image prune -f 2>&1 | grep "Total reclaimed space" || echo "0B")
    echo -e "${GREEN}✓ ${removed}${NC}"
}

cleanup_unused_volumes() {
    echo -e "${YELLOW}Removing unused volumes...${NC}"
    removed=$(docker volume prune -f 2>&1 | grep "Total reclaimed space" || echo "0B")
    echo -e "${GREEN}✓ ${removed}${NC}"
}

cleanup_unused_networks() {
    echo -e "${YELLOW}Removing unused networks...${NC}"
    removed=$(docker network prune -f 2>&1 | grep "Total reclaimed space" || echo "0B")
    echo -e "${GREEN}✓ ${removed}${NC}"
}

cleanup_build_cache() {
    echo -e "${YELLOW}Removing build cache...${NC}"
    removed=$(docker builder prune -f 2>&1 | grep "Total reclaimed space" || echo "0B")
    echo -e "${GREEN}✓ ${removed}${NC}"
}

full_cleanup() {
    echo -e "${RED}WARNING: This will remove ALL unused Docker resources!${NC}"
    echo -e "${RED}This includes:${NC}"
    echo -e "  - All stopped containers"
    echo -e "  - All unused networks"
    echo -e "  - All dangling images"
    echo -e "  - All unused volumes"
    echo -e "  - All build cache"
    echo ""
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo -e "${BLUE}Performing full cleanup...${NC}"
        docker system prune -a --volumes -f
        echo -e "${GREEN}✓ Full cleanup completed${NC}"
    else
        echo -e "${YELLOW}Cleanup cancelled${NC}"
    fi
}

# Main menu
echo "What would you like to clean up?"
echo ""
echo "1) Remove stopped containers only"
echo "2) Remove dangling images only"
echo "3) Remove unused volumes only"
echo "4) Remove unused networks only"
echo "5) Remove build cache only"
echo "6) Quick cleanup (containers + images + networks)"
echo "7) Full cleanup (ALL unused resources - CAUTION!)"
echo "8) Just show disk usage"
echo "9) Exit"
echo ""
read -p "Select option [1-9]: " choice

case $choice in
    1)
        show_disk_usage
        cleanup_stopped_containers
        echo ""
        show_disk_usage
        ;;
    2)
        show_disk_usage
        cleanup_unused_images
        echo ""
        show_disk_usage
        ;;
    3)
        show_disk_usage
        cleanup_unused_volumes
        echo ""
        show_disk_usage
        ;;
    4)
        show_disk_usage
        cleanup_unused_networks
        echo ""
        show_disk_usage
        ;;
    5)
        show_disk_usage
        cleanup_build_cache
        echo ""
        show_disk_usage
        ;;
    6)
        show_disk_usage
        cleanup_stopped_containers
        cleanup_unused_images
        cleanup_unused_networks
        echo ""
        show_disk_usage
        ;;
    7)
        show_disk_usage
        full_cleanup
        echo ""
        show_disk_usage
        ;;
    8)
        show_disk_usage
        ;;
    9)
        echo -e "${GREEN}Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Cleanup completed!${NC}"
echo ""
