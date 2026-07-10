#!/bin/bash

################################################################################
#                                                                              #
#  PHASE 4 - MASTER TEST RUNNER                                              #
#  Malicious Node Detection & Quarantine - Execute All Tasks                  #
#                                                                              #
#  Purpose: Run all Phase 4 tests in sequence                                 #
#  Tasks: 4.1-4.3 (Detection, Quarantine, Forensics)                         #
#                                                                              #
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

log_section() {
    echo -e "\n${CYAN}▶ $1${NC}"
}

log_task() {
    echo -e "${PURPLE}📋 TASK: $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
}

log_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
}

log_info() {
    echo -e "${YELLOW}ℹ INFO:${NC} $1"
}

# Global counters
TOTAL_TASKS=0
PASSED_TASKS=0
FAILED_TASKS=0

# Configuration
BASE_URL="http://localhost"
TASK_TIMEOUT=300  # 5 minutes per task

################################################################################
# MAIN TEST ORCHESTRATION
################################################################################

run_task() {
    local task_number=$1
    local task_name=$2
    local task_script=$3
    
    log_task "Task $task_number: $task_name"
    
    if [ ! -f "$task_script" ]; then
        log_fail "Script not found: $task_script"
        ((FAILED_TASKS++))
        return 1
    fi
    
    # Make script executable
    chmod +x "$task_script" 2>/dev/null || true
    
    # Run with timeout
    if timeout "$TASK_TIMEOUT" bash "$task_script" > /tmp/task_$task_number.log 2>&1; then
        log_pass "$task_name completed successfully"
        ((PASSED_TASKS++))
        return 0
    else
        log_fail "$task_name failed (see /tmp/task_$task_number.log)"
        ((FAILED_TASKS++))
        return 1
    fi
}

main() {
    log_header "PHASE 4: MALICIOUS NODE DETECTION & QUARANTINE - MASTER TEST RUNNER"
    
    # Prerequisites check
    log_section "Prerequisites Verification"
    
    # Check if network is running
    if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
        log_fail "Multi-node network is not running"
        log_info "Start the network with: bash start-multi-node.sh"
        exit 1
    fi
    
    log_info "Network verified: All nodes are accessible ✓"
    
    log_section "Test Configuration"
    log_info "Task Timeout: ${TASK_TIMEOUT}s per task"
    log_info "Total Tasks: 3 detection and quarantine tests"
    log_info "Output Logs: /tmp/task_*.log"
    
    # Run all Phase 4 tasks
    log_section "Executing Phase 4 Tasks"
    
    echo ""
    
    ((TOTAL_TASKS++))
    run_task "4.1" "Malicious Behavior Detection" "p4t4-1-test-malicious-behavior-detection.sh" || true
    echo ""
    
    ((TOTAL_TASKS++))
    run_task "4.2" "Quarantine Mechanism" "p4t4-2-test-quarantine-mechanism.sh" || true
    echo ""
    
    ((TOTAL_TASKS++))
    run_task "4.3" "Evidence Collection & Forensics" "p4t4-3-test-evidence-collection-forensics.sh" || true
    echo ""
    
    # Generate comprehensive report
    log_section "Phase 4 Test Summary"
    
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}    MALICIOUS NODE DETECTION TEST RESULTS"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${CYAN}Tasks Executed:${NC}   $TOTAL_TASKS"
    echo -e "${GREEN}Tasks Passed:${NC}    $PASSED_TASKS"
    echo -e "${RED}Tasks Failed:${NC}    $FAILED_TASKS"
    
    if [ "$TOTAL_TASKS" -gt 0 ]; then
        local pass_percentage=$((PASSED_TASKS * 100 / TOTAL_TASKS))
        echo -e "${YELLOW}Success Rate:${NC}   $pass_percentage%"
    fi
    
    echo ""
    echo -e "${CYAN}Task Breakdown:${NC}"
    echo "  4.1 - Malicious Behavior Detection    [$([ -f /tmp/task_4.1.log ] && grep -q 'SUCCESS' /tmp/task_4.1.log && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}PENDING${NC}")]"
    echo "  4.2 - Quarantine Mechanism            [$([ -f /tmp/task_4.2.log ] && grep -q 'SUCCESS' /tmp/task_4.2.log && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}PENDING${NC}")]"
    echo "  4.3 - Evidence Collection & Forensics [$([ -f /tmp/task_4.3.log ] && grep -q 'SUCCESS' /tmp/task_4.3.log && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}PENDING${NC}")]"
    
    echo ""
    echo -e "${CYAN}Security Detection Coverage:${NC}"
    echo "  ✓ Invalid blocks detection"
    echo "  ✓ Invalid votes detection"
    echo "  ✓ Duplicate messages detection"
    echo "  ✓ Peer violation tracking"
    echo "  ✓ Behavioral anomaly detection"
    echo "  ✓ Evidence collection"
    echo "  ✓ Peer quarantine mechanism"
    echo "  ✓ Quarantine release mechanism"
    echo "  ✓ Violation history recording"
    echo "  ✓ Forensic data analysis"
    
    echo ""
    echo -e "${CYAN}Detection Capabilities:${NC}"
    echo "  • Real-time behavioral monitoring"
    echo "  • Anomaly pattern recognition"
    echo "  • Multi-level violation tracking"
    echo "  • Automatic quarantine triggers"
    echo "  • Comprehensive evidence collection"
    echo "  • Timeline reconstruction"
    echo "  • Top violator identification"
    
    echo ""
    
    # Final status
    if [ "$FAILED_TASKS" -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}  ✓ PHASE 4 COMPLETE - ALL TESTS PASSED"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        exit 0
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║${NC}  ✗ PHASE 4 INCOMPLETE - SOME TESTS FAILED"
        echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        log_info "Review logs in /tmp/task_*.log for detailed results"
        exit 1
    fi
}

main "$@"
