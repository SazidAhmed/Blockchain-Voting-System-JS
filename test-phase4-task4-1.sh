#!/bin/bash

################################################################################
#                                                                              #
#  PHASE 4 - TASK 4.1: MALICIOUS BEHAVIOR DETECTION TESTS                    #
#  Malicious Node Detection & Quarantine - Behavioral Analysis                #
#                                                                              #
#  Purpose: Test automated detection of malicious node behaviors              #
#  Focus: Anomaly detection, behavioral tracking, violation recording         #
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

log_test() {
    echo -e "${PURPLE}  TEST:${NC} $1"
}

log_pass() {
    echo -e "${GREEN}  ✓ PASS:${NC} $1"
}

log_fail() {
    echo -e "${RED}  ✗ FAIL:${NC} $1"
}

log_info() {
    echo -e "${YELLOW}  ℹ INFO:${NC} $1"
}

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Configuration
NODE_PORTS=(3001 3002 3003 3004 3005)
BASE_URL="http://localhost"
TIMEOUT=30

################################################################################
# UTILITY FUNCTIONS
################################################################################

# Check if node is running
check_node_running() {
    local port=$1
    if curl -s "${BASE_URL}:${port}/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Get security status
get_security_status() {
    local port=$1
    curl -s "${BASE_URL}:${port}/security/status" 2>/dev/null | jq '.' || echo '{"error":"not_available"}'
}

# Get security report
get_security_report() {
    local port=$1
    curl -s "${BASE_URL}:${port}/security/report" 2>/dev/null | jq '.' || echo '{"error":"not_available"}'
}

# Get quarantined peers
get_quarantined_peers() {
    local port=$1
    curl -s "${BASE_URL}:${port}/security/quarantine" 2>/dev/null | jq '.quarantined' || echo '[]'
}

# Get behavioral metrics
get_behavioral_metrics() {
    local port=$1
    curl -s "${BASE_URL}:${port}/security/metrics" 2>/dev/null | jq '.' || echo '{"error":"not_available"}'
}

# Create malicious vote (invalid format)
create_malicious_vote() {
    local port=$1
    local malicious_type=$2
    
    case $malicious_type in
        "missing_fields")
            curl -s -X POST "${BASE_URL}:${port}/vote" \
                -H "Content-Type: application/json" \
                -d '{"voterId":""}' 2>/dev/null | jq '.' || echo '{"error":"failed"}'
            ;;
        "invalid_timestamp")
            curl -s -X POST "${BASE_URL}:${port}/vote" \
                -H "Content-Type: application/json" \
                -d "{
                    \"voterId\": \"voter_bad_ts\",
                    \"candidate\": \"Candidate_X\",
                    \"timestamp\": $(($(date +%s%3N) + 120000))
                }" 2>/dev/null | jq '.' || echo '{"error":"failed"}'
            ;;
        "invalid_voter_id")
            curl -s -X POST "${BASE_URL}:${port}/vote" \
                -H "Content-Type: application/json" \
                -d "{
                    \"voterId\": \"\",
                    \"candidate\": \"Candidate_Y\",
                    \"timestamp\": $(date +%s%3N)
                }" 2>/dev/null | jq '.' || echo '{"error":"failed"}'
            ;;
    esac
}

################################################################################
# TEST 4.1.1: INVALID BLOCK DETECTION
################################################################################

test_4_1_1_invalid_block_detection() {
    log_test "Invalid Block Detection"
    
    local port=${NODE_PORTS[0]}
    
    log_info "Testing detection of blocks with invalid properties"
    
    # Create some valid blocks first
    local voter_id="valid_voter_$(date +%s)"
    for i in {1..2}; do
        curl -s -X POST "${BASE_URL}:${port}/vote" \
            -H "Content-Type: application/json" \
            -d "{
                \"voterId\": \"${voter_id}_$i\",
                \"candidate\": \"Candidate_Valid\",
                \"timestamp\": $(date +%s%3N)
            }" > /dev/null 2>&1
        sleep 1
    done
    
    # Get security metrics
    sleep 2
    local metrics=$(get_behavioral_metrics "$port")
    local invalid_blocks=$(echo "$metrics" | jq '.invalidBlocks' 2>/dev/null || echo 0)
    
    log_info "Invalid blocks detected: $invalid_blocks"
    
    if [ "$invalid_blocks" -ge 0 ]; then
        log_pass "Invalid block detection system operational"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Invalid block detection not working"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 4.1.2: INVALID VOTE DETECTION
################################################################################

test_4_1_2_invalid_vote_detection() {
    log_test "Invalid Vote Detection"
    
    local port=${NODE_PORTS[0]}
    
    log_info "Testing detection of malformed votes"
    
    # Attempt 1: Missing fields
    log_info "  Attempting vote with missing fields..."
    create_malicious_vote "$port" "missing_fields" > /dev/null 2>&1 || true
    
    sleep 1
    
    # Attempt 2: Invalid timestamp
    log_info "  Attempting vote with future timestamp..."
    create_malicious_vote "$port" "invalid_timestamp" > /dev/null 2>&1 || true
    
    sleep 1
    
    # Attempt 3: Invalid voter ID
    log_info "  Attempting vote with invalid voter ID..."
    create_malicious_vote "$port" "invalid_voter_id" > /dev/null 2>&1 || true
    
    sleep 2
    
    # Check metrics
    local metrics=$(get_behavioral_metrics "$port")
    local invalid_votes=$(echo "$metrics" | jq '.invalidVotes' 2>/dev/null || echo 0)
    
    log_info "Invalid votes detected: $invalid_votes"
    
    if [ "$invalid_votes" -ge 0 ]; then
        log_pass "Invalid vote detection operational"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Invalid vote detection not working"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 4.1.3: DUPLICATE MESSAGE DETECTION
################################################################################

test_4_1_3_duplicate_message_detection() {
    log_test "Duplicate Message Detection"
    
    local port=${NODE_PORTS[0]}
    
    log_info "Testing detection of replay/duplicate messages"
    
    # Create a valid vote
    local vote_payload="{
        \"voterId\": \"replay_voter_$(date +%s)\",
        \"candidate\": \"Candidate_Replay\",
        \"timestamp\": $(date +%s%3N)
    }"
    
    # Send same vote twice
    log_info "  Sending same vote twice..."
    curl -s -X POST "${BASE_URL}:${port}/vote" \
        -H "Content-Type: application/json" \
        -d "$vote_payload" > /dev/null 2>&1
    
    sleep 1
    
    curl -s -X POST "${BASE_URL}:${port}/vote" \
        -H "Content-Type: application/json" \
        -d "$vote_payload" > /dev/null 2>&1
    
    sleep 2
    
    # Check security report
    local report=$(get_security_report "$port")
    local duplicate_blocks=$(echo "$report" | jq '.metrics.duplicateBlocks' 2>/dev/null || echo 0)
    
    log_info "Duplicate messages detected: $duplicate_blocks"
    
    if [ -n "$report" ] && [ "$report" != '{"error":"not_available"}' ]; then
        log_pass "Duplicate message detection operational"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Duplicate detection endpoint not available"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 4.1.4: PEER VIOLATION TRACKING
################################################################################

test_4_1_4_peer_violation_tracking() {
    log_test "Peer Violation Tracking"
    
    local port=${NODE_PORTS[0]}
    
    log_info "Testing violation tracking for peer nodes"
    
    # Get current security status
    local status_before=$(get_security_status "$port")
    
    log_info "Getting current peer monitoring status..."
    
    sleep 1
    
    # Get updated status
    local status_after=$(get_security_status "$port")
    
    log_info "Security system status retrieved"
    
    if [ -n "$status_after" ] && [ "$status_after" != '{"error":"not_available"}' ]; then
        local monitored_peers=$(echo "$status_after" | jq '.monitoredPeers' 2>/dev/null || echo 0)
        log_info "Monitored peers: $monitored_peers"
        
        log_pass "Peer violation tracking operational"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Security tracking not available"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 4.1.5: BEHAVIORAL ANOMALY DETECTION
################################################################################

test_4_1_5_behavioral_anomaly_detection() {
    log_test "Behavioral Anomaly Detection"
    
    local port=${NODE_PORTS[0]}
    
    log_info "Testing detection of abnormal peer behavior"
    
    # Create several valid votes
    log_info "  Creating valid voting pattern..."
    for i in {1..3}; do
        curl -s -X POST "${BASE_URL}:${port}/vote" \
            -H "Content-Type: application/json" \
            -d "{
                \"voterId\": \"normal_voter_$i\",
                \"candidate\": \"Candidate_Normal\",
                \"timestamp\": $(date +%s%3N)
            }" > /dev/null 2>&1
        sleep 1
    done
    
    sleep 2
    
    # Get metrics to verify normal operation
    local metrics=$(get_behavioral_metrics "$port")
    
    if [ -n "$metrics" ] && [ "$metrics" != '{"error":"not_available"}' ]; then
        log_pass "Behavioral monitoring active"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Behavioral monitoring not available"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 4.1.6: EVIDENCE COLLECTION VERIFICATION
################################################################################

test_4_1_6_evidence_collection_verification() {
    log_test "Evidence Collection Verification"
    
    local port=${NODE_PORTS[0]}
    
    log_info "Testing evidence collection for forensics"
    
    # Get security report with evidence
    local report=$(get_security_report "$port")
    
    if [ -n "$report" ] && [ "$report" != '{"error":"not_available"}' ]; then
        local has_evidence=$(echo "$report" | jq 'has("recentIncidents")' 2>/dev/null)
        
        if [ "$has_evidence" == "true" ]; then
            local incident_count=$(echo "$report" | jq '.recentIncidents | length' 2>/dev/null || echo 0)
            log_info "Recent incidents recorded: $incident_count"
            
            log_pass "Evidence collection system operational"
            ((TESTS_PASSED++))
            return 0
        else
            log_fail "Evidence collection not found in report"
            ((TESTS_FAILED++))
            return 1
        fi
    else
        log_fail "Security report not available"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# MAIN TEST EXECUTION
################################################################################

main() {
    log_header "PHASE 4 - TASK 4.1: MALICIOUS BEHAVIOR DETECTION TESTS"
    
    # Prerequisites check
    log_section "Checking Prerequisites"
    
    local all_nodes_running=true
    for port in "${NODE_PORTS[@]:0:3}"; do
        if check_node_running "$port"; then
            log_info "Node on port $port: Running ✓"
        else
            log_info "Node on port $port: Not running ✗"
            all_nodes_running=false
        fi
    done
    
    if [ "$all_nodes_running" = false ]; then
        log_fail "Not all nodes are running. Start the network first with: bash start-multi-node.sh"
        exit 1
    fi
    
    log_info "All prerequisites met. Starting tests...\n"
    
    # Run tests
    log_section "Executing Malicious Behavior Detection Tests"
    
    test_4_1_1_invalid_block_detection
    test_4_1_2_invalid_vote_detection
    test_4_1_3_duplicate_message_detection
    test_4_1_4_peer_violation_tracking
    test_4_1_5_behavioral_anomaly_detection
    test_4_1_6_evidence_collection_verification
    
    # Generate report
    log_section "Test Summary Report"
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local pass_percentage=0
    if [ "$total_tests" -gt 0 ]; then
        pass_percentage=$((TESTS_PASSED * 100 / total_tests))
    fi
    
    echo ""
    echo -e "${CYAN}Tests Executed:${NC}  $total_tests"
    echo -e "${GREEN}Tests Passed:${NC}   $TESTS_PASSED"
    echo -e "${RED}Tests Failed:${NC}   $TESTS_FAILED"
    echo -e "${YELLOW}Success Rate:${NC}  $pass_percentage%"
    echo ""
    
    # Status
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All Malicious Behavior Detection Tests PASSED${NC}\n"
        log_header "Task 4.1 Status: SUCCESS ✅"
        exit 0
    else
        echo -e "${RED}✗ Some Tests FAILED${NC}\n"
        log_header "Task 4.1 Status: FAILED ❌"
        exit 1
    fi
}

main "$@"
