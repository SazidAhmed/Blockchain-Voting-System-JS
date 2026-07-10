#!/bin/bash

##############################################################################
# Phase 5: Recovery & Resilience Testing - Master Orchestrator
# 
# Runs all Phase 5 tests in sequence:
# - Task 5.1: Network Recovery After Attack (6 tests)
# - Task 5.2: Byzantine Fault Tolerance (6 tests)
# - Task 5.3: Disaster Recovery Procedures (6 tests)
#
# Total: 18 comprehensive recovery and resilience tests
##############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test tracking
declare -A TASK_RESULTS
declare -A TASK_DURATION
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0

##############################################################################
# UTILITY FUNCTIONS
##############################################################################

log_header() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║ $1"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

log_task_start() {
  echo -e "${MAGENTA}[TASK]${NC} Starting $1..."
}

log_task_complete() {
  echo -e "${CYAN}[TASK]${NC} Completed $1"
}

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
}

log_error() {
  echo -e "${RED}[FAIL]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

##############################################################################
# TASK EXECUTION
##############################################################################

run_task_5_1() {
  local task_name="Task 5.1: Network Recovery After Attack"
  log_task_start "$task_name"
  
  local start_time=$(date +%s)
  
  if bash "$SCRIPT_DIR/test-phase5-task5-1.sh"; then
    TASK_RESULTS["5.1"]="PASS"
    log_task_complete "$task_name"
  else
    TASK_RESULTS["5.1"]="FAIL"
    log_error "$task_name failed"
  fi
  
  local end_time=$(date +%s)
  TASK_DURATION["5.1"]=$((end_time - start_time))
}

run_task_5_2() {
  local task_name="Task 5.2: Byzantine Fault Tolerance Testing"
  log_task_start "$task_name"
  
  local start_time=$(date +%s)
  
  if bash "$SCRIPT_DIR/test-phase5-task5-2.sh"; then
    TASK_RESULTS["5.2"]="PASS"
    log_task_complete "$task_name"
  else
    TASK_RESULTS["5.2"]="FAIL"
    log_error "$task_name failed"
  fi
  
  local end_time=$(date +%s)
  TASK_DURATION["5.2"]=$((end_time - start_time))
}

run_task_5_3() {
  local task_name="Task 5.3: Disaster Recovery Procedures"
  log_task_start "$task_name"
  
  local start_time=$(date +%s)
  
  if bash "$SCRIPT_DIR/test-phase5-task5-3.sh"; then
    TASK_RESULTS["5.3"]="PASS"
    log_task_complete "$task_name"
  else
    TASK_RESULTS["5.3"]="FAIL"
    log_error "$task_name failed"
  fi
  
  local end_time=$(date +%s)
  TASK_DURATION["5.3"]=$((end_time - start_time))
}

##############################################################################
# RESULTS AGGREGATION
##############################################################################

aggregate_results() {
  log_header "  PHASE 5 RESULTS AGGREGATION"
  
  echo "Task Results:"
  echo "─────────────────────────────────"
  
  for task in "5.1" "5.2" "5.3"; do
    local result="${TASK_RESULTS[$task]}"
    local duration="${TASK_DURATION[$task]}"
    local status_icon=""
    
    if [ "$result" = "PASS" ]; then
      status_icon="${GREEN}✓${NC}"
    else
      status_icon="${RED}✗${NC}"
    fi
    
    printf "  Task 5.$((${task##*.})): %b %-4s (${duration}s)\n" "$status_icon" "$result"
  done
  
  echo ""
}

##############################################################################
# MAIN EXECUTION
##############################################################################

main() {
  log_header "  PHASE 5: RECOVERY & RESILIENCE TESTING"
  echo "  Master Test Orchestrator"
  echo "  Running 3 Tasks, 18 Total Tests"
  echo ""
  
  local overall_start=$(date +%s)
  
  # Run all tasks
  run_task_5_1
  echo ""
  
  run_task_5_2
  echo ""
  
  run_task_5_3
  echo ""
  
  local overall_end=$(date +%s)
  local overall_duration=$((overall_end - overall_start))
  
  # Aggregate results
  aggregate_results
  
  # Calculate totals
  local passed=0
  local failed=0
  for task in "5.1" "5.2" "5.3"; do
    if [ "${TASK_RESULTS[$task]}" = "PASS" ]; then
      ((passed++))
    else
      ((failed++))
    fi
  done
  
  # Print final summary
  log_header "  PHASE 5 SUMMARY"
  
  echo "Coverage:"
  echo "  Task 5.1: Network Recovery ..................... 6 tests"
  echo "  Task 5.2: Byzantine Fault Tolerance ............ 6 tests"
  echo "  Task 5.3: Disaster Recovery .................... 6 tests"
  echo "  ────────────────────────────────────────────────────"
  echo "  Total Phase 5 Tests ............................ 18 tests"
  echo ""
  
  echo "Results:"
  echo "  Tasks Passed: $passed/3"
  echo "  Tasks Failed: $failed/3"
  echo "  Total Duration: ${overall_duration}s"
  echo ""
  
  # Overall status
  if [ "$failed" -eq 0 ]; then
    echo -e "  Status: ${GREEN}✓ ALL PHASE 5 TESTS PASSED${NC}"
    echo ""
    echo "  Phase 5 successfully verified:"
    echo "    • Network recovery after attacks"
    echo "    • Byzantine fault tolerance limits"
    echo "    • Disaster recovery procedures"
    echo "    • Consensus resilience"
    echo "    • System self-healing"
    echo ""
    return 0
  else
    echo -e "  Status: ${RED}✗ SOME PHASE 5 TESTS FAILED${NC}"
    echo ""
    return 1
  fi
}

# Run main function
main
exit $?
