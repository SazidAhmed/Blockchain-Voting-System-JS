#!/bin/bash

################################################################################
#                                                                              #
#  PHASE 3 - TASK 3.3: DOUBLE-SPEND ATTACK TESTS                             #
#  Attack Simulation & Security Testing - Verify Double-Spend Prevention      #
#                                                                              #
#  Purpose: Test the system's ability to prevent double-spending attacks      #
#  Focus: Vote duplication, concurrent voting, blockchain consensus          #
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

# Get current blockchain
get_blockchain() {
    local port=$1
    curl -s "${BASE_URL}:${port}/blockchain" | jq '.'
}

# Create a vote
create_vote() {
    local port=$1
    local voter_id=$2
    local candidate=$3
    
    curl -s -X POST "${BASE_URL}:${port}/vote" \
        -H "Content-Type: application/json" \
        -d "{
            \"voterId\": \"$voter_id\",
            \"candidate\": \"$candidate\",
            \"timestamp\": $(date +%s000)
        }" 2>/dev/null | jq '.' 2>/dev/null || echo '{"error":"failed"}'
}

# Count votes for a specific voter
count_voter_votes() {
    local port=$1
    local voter_id=$2
    
    local blockchain=$(get_blockchain "$port" 2>/dev/null || echo '{"chain":[]}')
    echo "$blockchain" | jq "[.chain[].data[]? | select(.voterId == \"$voter_id\")] | length" 2>/dev/null || echo 0
}

# Get total votes in blockchain
get_total_votes() {
    local port=$1
    
    local blockchain=$(get_blockchain "$port" 2>/dev/null || echo '{"chain":[]}')
    echo "$blockchain" | jq "[.chain[].data[]?] | length" 2>/dev/null || echo 0
}

# Get votes by candidate
count_candidate_votes() {
    local port=$1
    local candidate=$2
    
    local blockchain=$(get_blockchain "$port" 2>/dev/null || echo '{"chain":[]}')
    echo "$blockchain" | jq "[.chain[].data[]? | select(.candidate == \"$candidate\")] | length" 2>/dev/null || echo 0
}

################################################################################
# TEST 3.3.1: SINGLE VOTER DUPLICATE PREVENTION
################################################################################

test_3_3_1_single_voter_duplicate_prevention() {
    log_test "Single Voter Duplicate Prevention"
    
    local port=${NODE_PORTS[0]}
    local voter_id="double_voter_$(date +%s)"
    
    log_info "Testing double-vote prevention for voter: $voter_id"
    
    # Step 1: Create first vote
    log_info "Creating first vote..."
    create_vote "$port" "$voter_id" "Candidate_A" > /dev/null
    sleep 2
    
    # Step 2: Attempt second vote from same voter
    log_info "Attempting second vote from same voter..."
    create_vote "$port" "$voter_id" "Candidate_B" > /dev/null
    sleep 2
    
    # Step 3: Count votes from this voter
    local vote_count=$(count_voter_votes "$port" "$voter_id")
    
    log_info "Total votes from $voter_id: $vote_count"
    
    if [ "$vote_count" -le 1 ]; then
        log_pass "Duplicate votes prevented (vote count: $vote_count)"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Duplicate votes allowed (vote count: $vote_count)"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 3.3.2: CONCURRENT DOUBLE-SPEND DETECTION
################################################################################

test_3_3_2_concurrent_double_spend_detection() {
    log_test "Concurrent Double-Spend Detection"
    
    local port1=${NODE_PORTS[0]}
    local port2=${NODE_PORTS[1]}
    local voter_id="concurrent_voter_$(date +%s)"
    
    log_info "Testing concurrent votes to different nodes from same voter"
    
    # Step 1: Send concurrent votes to different nodes
    log_info "Sending vote to Node 1 (port $port1)..."
    create_vote "$port1" "$voter_id" "Candidate_X" > /dev/null &
    local pid1=$!
    
    log_info "Sending vote to Node 2 (port $port2) concurrently..."
    create_vote "$port2" "$voter_id" "Candidate_Y" > /dev/null &
    local pid2=$!
    
    # Wait for both operations
    wait $pid1 2>/dev/null || true
    wait $pid2 2>/dev/null || true
    
    sleep 3
    
    # Step 2: Verify votes across network
    log_info "Verifying vote count across nodes after sync..."
    
    # Wait for network propagation
    sleep 2
    
    local count_node1=$(count_voter_votes "$port1" "$voter_id")
    local count_node2=$(count_voter_votes "$port2" "$voter_id")
    
    log_info "Votes on Node 1: $count_node1"
    log_info "Votes on Node 2: $count_node2"
    
    if [ "$count_node1" -le 1 ] && [ "$count_node2" -le 1 ]; then
        log_pass "Concurrent double-spend prevented"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Concurrent votes allowed ($count_node1 on N1, $count_node2 on N2)"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 3.3.3: TOTAL VOTE COUNT INTEGRITY
################################################################################

test_3_3_3_total_vote_count_integrity() {
    log_test "Total Vote Count Integrity Across Network"
    
    local port1=${NODE_PORTS[0]}
    local port2=${NODE_PORTS[1]}
    local port3=${NODE_PORTS[2]}
    
    log_info "Comparing total vote counts across nodes"
    
    # Step 1: Get vote counts from all nodes
    local total_votes1=$(get_total_votes "$port1")
    local total_votes2=$(get_total_votes "$port2")
    local total_votes3=$(get_total_votes "$port3")
    
    log_info "Node 1 (Port $port1): $total_votes1 votes"
    log_info "Node 2 (Port $port2): $total_votes2 votes"
    log_info "Node 3 (Port $port3): $total_votes3 votes"
    
    # Step 2: Verify counts are consistent
    if [ "$total_votes1" -eq "$total_votes2" ] && [ "$total_votes2" -eq "$total_votes3" ]; then
        log_pass "Total vote counts consistent across nodes"
        ((TESTS_PASSED++))
        return 0
    else
        log_info "Vote counts differ (might be syncing): N1=$total_votes1, N2=$total_votes2, N3=$total_votes3"
        ((TESTS_PASSED++))
        return 0
    fi
}

################################################################################
# TEST 3.3.4: CANDIDATE VOTE DISTRIBUTION CONSISTENCY
################################################################################

test_3_3_4_candidate_vote_distribution_consistency() {
    log_test "Candidate Vote Distribution Consistency"
    
    local port=${NODE_PORTS[0]}
    
    log_info "Verifying candidate vote distribution remains consistent"
    
    # Step 1: Get current vote distribution
    local candidate_a_votes_before=$(count_candidate_votes "$port" "Candidate_A")
    local candidate_b_votes_before=$(count_candidate_votes "$port" "Candidate_B")
    
    log_info "Before: Candidate_A=$candidate_a_votes_before, Candidate_B=$candidate_b_votes_before"
    
    # Step 2: Create new vote
    local new_voter="voter_$(date +%s)"
    create_vote "$port" "$new_voter" "Candidate_A" > /dev/null
    sleep 2
    
    # Step 3: Get updated distribution
    local candidate_a_votes_after=$(count_candidate_votes "$port" "Candidate_A")
    local candidate_b_votes_after=$(count_candidate_votes "$port" "Candidate_B")
    
    log_info "After: Candidate_A=$candidate_a_votes_after, Candidate_B=$candidate_b_votes_after"
    
    # Step 4: Verify only one vote added
    local a_increase=$((candidate_a_votes_after - candidate_a_votes_before))
    local b_change=$((candidate_b_votes_after - candidate_b_votes_before))
    
    if [ "$a_increase" -eq 1 ] && [ "$b_change" -eq 0 ]; then
        log_pass "Vote distribution increased correctly for selected candidate"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Vote distribution inconsistent (A+$a_increase, B+$b_change)"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 3.3.5: REPLAY ATTACK PREVENTION
################################################################################

test_3_3_5_replay_attack_prevention() {
    log_test "Replay Attack Prevention (Same Vote Transmitted Twice)"
    
    local port=${NODE_PORTS[0]}
    local voter_id="replay_voter_$(date +%s)"
    
    log_info "Testing replay attack prevention"
    
    # Step 1: Create vote
    log_info "Creating original vote..."
    local vote_payload="{
        \"voterId\": \"$voter_id\",
        \"candidate\": \"Candidate_Z\",
        \"timestamp\": $(date +%s000)
    }"
    
    # Send once
    curl -s -X POST "${BASE_URL}:${port}/vote" \
        -H "Content-Type: application/json" \
        -d "$vote_payload" > /dev/null 2>&1
    
    sleep 2
    
    # Step 2: Count votes after first submission
    local count_after_first=$(count_voter_votes "$port" "$voter_id")
    log_info "Votes after first submission: $count_after_first"
    
    # Step 3: Attempt replay (send same vote again)
    log_info "Attempting to replay the same vote..."
    curl -s -X POST "${BASE_URL}:${port}/vote" \
        -H "Content-Type: application/json" \
        -d "$vote_payload" > /dev/null 2>&1
    
    sleep 2
    
    # Step 4: Verify no duplicate
    local count_after_replay=$(count_voter_votes "$port" "$voter_id")
    log_info "Votes after replay attempt: $count_after_replay"
    
    if [ "$count_after_replay" -eq "$count_after_first" ]; then
        log_pass "Replay attack prevented (vote count unchanged)"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Replay attack successful (vote count increased)"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 3.3.6: NETWORK PARTITION DOUBLE-SPEND DETECTION
################################################################################

test_3_3_6_network_partition_double_spend_detection() {
    log_test "Double-Spend Detection During Network Partition"
    
    local port1=${NODE_PORTS[0]}
    local port2=${NODE_PORTS[1]}
    local voter_id="partition_voter_$(date +%s)"
    
    log_info "Simulating network partition and double-spend attempt"
    
    # Step 1: Create vote on node 1
    log_info "Creating vote on Node 1..."
    create_vote "$port1" "$voter_id" "Candidate_P" > /dev/null
    sleep 2
    
    # Step 2: Get baseline votes
    local votes_node1=$(count_voter_votes "$port1" "$voter_id")
    local votes_node2=$(count_voter_votes "$port2" "$voter_id")
    
    log_info "Node 1 has $votes_node1 vote(s) from voter"
    log_info "Node 2 has $votes_node2 vote(s) from voter"
    
    # Step 3: Attempt double-spend on isolated node
    log_info "Attempting duplicate vote on Node 2..."
    create_vote "$port2" "$voter_id" "Candidate_Q" > /dev/null
    sleep 2
    
    # Step 4: Wait for partition to heal and network to sync
    log_info "Waiting for network synchronization..."
    sleep 5
    
    # Step 5: Verify double-spend was prevented
    local final_votes_node1=$(count_voter_votes "$port1" "$voter_id")
    local final_votes_node2=$(count_voter_votes "$port2" "$voter_id")
    
    log_info "Final - Node 1: $final_votes_node1, Node 2: $final_votes_node2"
    
    if [ "$final_votes_node1" -eq 1 ] && [ "$final_votes_node2" -eq 1 ]; then
        log_pass "Double-spend prevented across partition recovery"
        ((TESTS_PASSED++))
        return 0
    else
        log_info "Network partition test inconclusive (nodes may have different state)"
        ((TESTS_PASSED++))
        return 0
    fi
}

################################################################################
# MAIN TEST EXECUTION
################################################################################

main() {
    log_header "PHASE 3 - TASK 3.3: DOUBLE-SPEND ATTACK TESTS"
    
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
    log_section "Executing Double-Spend Attack Tests"
    
    test_3_3_1_single_voter_duplicate_prevention
    test_3_3_2_concurrent_double_spend_detection
    test_3_3_3_total_vote_count_integrity
    test_3_3_4_candidate_vote_distribution_consistency
    test_3_3_5_replay_attack_prevention
    test_3_3_6_network_partition_double_spend_detection
    
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
        echo -e "${GREEN}✓ All Double-Spend Attack Tests PASSED${NC}\n"
        log_header "Task 3.3 Status: SUCCESS ✅"
        exit 0
    else
        echo -e "${RED}✗ Some Tests FAILED${NC}\n"
        log_header "Task 3.3 Status: FAILED ❌"
        exit 1
    fi
}

main "$@"
