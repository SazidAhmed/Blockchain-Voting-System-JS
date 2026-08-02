#!/bin/bash
# Interactive test runner for University Blockchain Voting System.
# Resets stack, seeds data, runs selected categories with backend restart between each.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-config.sh"

declare -a ORDERED_CATEGORIES=(smoke-test integration-test detection-test attack-test security-suite resilience-test)

description() {
  case "$1" in
    smoke-test)        echo "Core flow: health, login, vote, double-vote, DB" ;;
    integration-test)  echo "Full vote lifecycle, blockchain, audit trail" ;;
    detection-test)    echo "Node health, chain consistency, merkle stats" ;;
    attack-test)       echo "Tampered ballot, replay, SQLi, no-auth, rate-limit, JWT, large payload" ;;
    security-suite)    echo "No-auth vote, nullifier uniqueness, XSS, rate-limit" ;;
    resilience-test)   echo "Node restart, post-restart vote, sync, backend restart" ;;
    *) echo "" ;;
  esac
}

show_menu() {
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  Blockchain Voting System Test Suite${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  echo "Available categories:"
  for i in "${!ORDERED_CATEGORIES[@]}"; do
    cat="${ORDERED_CATEGORIES[$i]}"
    echo "  $((i+1))) $cat"
    echo "      $(description "$cat")"
  done
  echo ""
  echo "  a) Run ALL categories (with full stack reset)"
  echo "  q) Quit"
  echo ""
}

run_category() {
  local script="$1"
  if bash "$SCRIPT_DIR/categories/$script.sh"; then
    echo -e "${GREEN}PASS${NC}"
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    return 1
  fi
}

run_selected() {
  local categories=("$@")
  local results=()
  local all_pass=true

  for script in "${categories[@]}"; do
    echo -e "\n${BLUE}==================================${NC}"
    echo -e "${BLUE}[${script}]${NC} $(description "$script")"
    echo -e "${BLUE}==================================${NC}"
    if run_category "$script"; then
      results+=("$script: ${GREEN}PASS${NC}")
    else
      results+=("$script: ${RED}FAIL${NC}")
      all_pass=false
    fi
    # Restart backend between categories to reset rate-limiter
    echo -e "\n${YELLOW}→ Restarting backend...${NC}"
    docker compose -f "$COMPOSE_FILE" restart backend 2>/dev/null
    for i in $(seq 1 30); do
      if curl -s -o /dev/null "$BACKEND_HOST/health" 2>/dev/null; then
        break
      fi
      sleep 2
    done
  done

  echo -e "\n${BLUE}==================================${NC}"
  echo -e "${BLUE}          RESULTS${NC}"
  echo -e "${BLUE}==================================${NC}"
  for r in "${results[@]}"; do echo -e "  $r"; done
  echo -e "${BLUE}==================================${NC}"
  if [ "$all_pass" = true ]; then
    echo -e "${GREEN}ALL PASS${NC}"
    exit 0
  else
    echo -e "${RED}SOME FAILURES${NC}"
    exit 1
  fi
}

full_reset() {
  echo -e "\n${YELLOW}→ Full stack reset (down -v, up -d, seed)...${NC}"
  docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null
  docker compose -f "$COMPOSE_FILE" up -d --build 2>/dev/null
  echo -n "Waiting for backend..."
  for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "" "$BACKEND_HOST/health" 2>/dev/null; then
      echo " ready"
      break
    fi
    sleep 2
  done
  docker compose -f "$COMPOSE_FILE" exec -T backend node scripts/seed.js 2>/dev/null
  bash "$PROJECT_DIR/infra/scripts/seed-test-data.sh" 2>/dev/null
  echo -e "${GREEN}✓ Stack ready${NC}"
}

# Parse args
if [ $# -gt 0 ]; then
  case "$1" in
    --help|-h)
      show_menu
      echo "Usage: $0 [category-name|all]"
      echo "  No args  → interactive menu"
      echo "  all      → reset stack + run all"
      echo "  NAME     → run single category (no reset)"
      exit 0
      ;;
    all)
      full_reset
      run_selected "${ORDERED_CATEGORIES[@]}"
      exit $?
      ;;
    *)
      if [[ " ${ORDERED_CATEGORIES[*]} " == *" $1 "* ]]; then
        run_selected "$1"
        exit $?
      else
        echo -e "${RED}Unknown category: $1${NC}"
        show_menu
        exit 1
      fi
      ;;
  esac
fi

# Interactive menu
while true; do
  show_menu
  read -p "Select categories (e.g. 1 3 5 or 1-3 or a or q): " choice

  case "$choice" in
    q|Q)
      echo "Bye"
      exit 0
      ;;
    a|A)
      full_reset
      run_selected "${ORDERED_CATEGORIES[@]}"
      exit $?
      ;;
    *-*)
      # Range like 1-3
      start=$(echo "$choice" | cut -d- -f1)
      end=$(echo "$choice" | cut -d- -f2)
      selected=()
      for i in $(seq "$start" "$end"); do
        idx=$((i-1))
        [ $idx -ge 0 ] && [ $idx -lt ${#ORDERED_CATEGORIES[@]} ] && selected+=("${ORDERED_CATEGORIES[$idx]}")
      done
      if [ ${#selected[@]} -gt 0 ]; then
        full_reset
        run_selected "${selected[@]}"
        exit $?
      fi
      ;;
    *)
      selected=()
      for num in $choice; do
        idx=$((num-1))
        [ $idx -ge 0 ] && [ $idx -lt ${#ORDERED_CATEGORIES[@]} ] && selected+=("${ORDERED_CATEGORIES[$idx]}")
      done
      if [ ${#selected[@]} -gt 0 ]; then
        full_reset
        run_selected "${selected[@]}"
        exit $?
      fi
      ;;
  esac
  echo -e "${RED}Invalid selection${NC}"
done
