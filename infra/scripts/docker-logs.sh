#!/bin/bash

# ==========================================
# Docker Logs Viewer for Voting System
# ==========================================
# Advanced log viewing with filtering and following

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

show_menu() {
    clear
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${BLUE}  Voting System Logs Viewer${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo ""
    echo "1) View all logs (follow)"
    echo "2) View backend logs"
    echo "3) View frontend logs"
    echo "4) View blockchain logs"
    echo "5) View MySQL logs"
    echo "6) View phpMyAdmin logs"
    echo "7) View last 50 lines (all services)"
    echo "8) Search logs (grep)"
    echo "9) View error logs only"
    echo "0) Exit"
    echo ""
}

view_all_logs() {
    echo -e "${BLUE}Following all logs (Ctrl+C to stop)...${NC}"
    docker-compose logs -f
}

view_service_logs() {
    local service=$1
    echo -e "${BLUE}Following ${service} logs (Ctrl+C to stop)...${NC}"
    docker-compose logs -f ${service}
}

view_last_lines() {
    echo -e "${BLUE}Last 50 lines from all services:${NC}"
    docker-compose logs --tail=50
    echo ""
    read -p "Press Enter to continue..."
}

search_logs() {
    echo ""
    read -p "Enter search term: " search_term
    if [ -z "$search_term" ]; then
        echo -e "${RED}No search term provided${NC}"
        return
    fi
    echo -e "${BLUE}Searching for '${search_term}'...${NC}"
    docker-compose logs | grep -i "$search_term" --color=always | less -R
}

view_errors() {
    echo -e "${BLUE}Viewing error logs...${NC}"
    docker-compose logs | grep -iE "error|exception|fatal|fail" --color=always | less -R
}

# Main loop
while true; do
    show_menu
    read -p "Select option: " choice
    
    case $choice in
        1) view_all_logs ;;
        2) view_service_logs "backend" ;;
        3) view_service_logs "frontend" ;;
        4) view_service_logs "blockchain-node" ;;
        5) view_service_logs "mysql" ;;
        6) view_service_logs "phpmyadmin" ;;
        7) view_last_lines ;;
        8) search_logs ;;
        9) view_errors ;;
        0) 
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            sleep 1
            ;;
    esac
done
