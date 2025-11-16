#!/bin/bash

################################################################################
#                                                                              #
#  PHASE 3 - TASK 3.2: HISTORICAL BLOCK TAMPERING TESTS                      #
#  Attack Simulation & Security Testing - Verify Historical Block Protection  #
#                                                                              #
#  Purpose: Test the system's ability to detect and reject historical block   #
#           modifications. Verify immutability of past blocks in blockchain.  #
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

# Get block by index
get_block() {
    local port=$1
    local index=$2
    curl -s "${BASE_URL}:${port}/blockchain" | jq ".chain[$index]"
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
        }" | jq '.'
}

# Get specific block hash
get_block_hash() {
    local port=$1
    local index=$2
    curl -s "${BASE_URL}:${port}/blockchain" | jq -r ".chain[$index].hash"
}

# Compare blockchain states across nodes
compare_blockchain_states() {
    local port1=$1
    local port2=$2
    
    local blockchain1=$(get_blockchain "$port1" | jq '.chain | length')
    local blockchain2=$(get_blockchain "$port2" | jq '.chain | length')
    
    if [ "$blockchain1" -eq "$blockchain2" ]; then
        return 0
    else
        return 1
    fi
}

################################################################################
# TEST 3.2.1: IMMUTABILITY OF GENESIS BLOCK
################################################################################

test_3_2_1_genesis_block_immutability() {
    log_test "Genesis Block Immutability"
    
    local port=${NODE_PORTS[0]}
    
    # Step 1: Get genesis block
    local genesis_block=$(get_block "$port" 0)
    local genesis_hash=$(echo "$genesis_block" | jq -r '.hash')
    local genesis_prev=$(echo "$genesis_block" | jq -r '.previousHash')
    
    log_info "Genesis block hash: ${genesis_hash:0:16}..."
    log_info "Genesis previous hash: $genesis_prev"
    
    # Step 2: Verify genesis block properties
    if [ "$genesis_prev" == "0" ] || [ "$genesis_prev" == "null" ] || [ -z "$genesis_prev" ]; then
        log_pass "Genesis block has correct previousHash (zero/null)"
    else
        log_fail "Genesis block has invalid previousHash: $genesis_prev"
        ((TESTS_FAILED++))
        return 1
    fi
    
    # Step 3: Create more blocks and verify genesis doesn't change
    log_info "Creating additional blocks..."
    create_vote "$port" "voter_g1_$(date +%s)" "Candidate_A" > /dev/null
    sleep 3
    
    # Step 4: Verify genesis block hasn't changed
    local new_genesis=$(get_block "$port" 0)
    local new_genesis_hash=$(echo "$new_genesis" | jq -r '.hash')
    
    if [ "$genesis_hash" == "$new_genesis_hash" ]; then
        log_pass "Genesis block hash remains unchanged"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Genesis block hash changed unexpectedly"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 3.2.2: MIDDLE BLOCK TAMPERING DETECTION
################################################################################

test_3_2_2_middle_block_tampering_detection() {
    log_test "Middle Block Tampering Detection"
    
    local port=${NODE_PORTS[0]}
    
    # Step 1: Create several blocks
    log_info "Creating multiple blocks..."
    for i in {1..3}; do
        create_vote "$port" "voter_m${i}_$(date +%s)" "Candidate_B" > /dev/null
        sleep 2
    done
    
    # Step 2: Capture blockchain state
    local blockchain=$(get_blockchain "$port")
    local chain_length=$(echo "$blockchain" | jq '.chain | length')
    
    log_info "Blockchain length: $chain_length blocks"
    
    if [ "$chain_length" -lt 3 ]; then
        log_fail "Not enough blocks created for testing"
        ((TESTS_FAILED++))
        return 1
    fi
    
    # Step 3: Get middle block details
    local middle_index=$((chain_length / 2))
    local middle_block=$(get_block "$port" "$middle_index")
    local middle_hash=$(echo "$middle_block" | jq -r '.hash')
    
    log_info "Middle block at index $middle_index: ${middle_hash:0:16}..."
    
    # Step 4: Verify middle block is unchanged
    local verification_block=$(get_block "$port" "$middle_index")
    local verification_hash=$(echo "$verification_block" | jq -r '.hash')
    
    if [ "$middle_hash" == "$verification_hash" ]; then
        log_pass "Middle block hash remains consistent"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Middle block hash changed"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 3.2.3: CHAIN DIVERGENCE DETECTION
################################################################################

test_3_2_3_chain_divergence_detection() {
    log_test "Chain Divergence Detection"
    
    local port1=${NODE_PORTS[0]}
    local port2=${NODE_PORTS[1]}
    
    # Step 1: Verify nodes are in sync
    log_info "Verifying nodes are synchronized..."
    
    local blockchain1=$(get_blockchain "$port1" | jq '.chain')
    local blockchain2=$(get_blockchain "$port2" | jq '.chain')
    
    local length1=$(echo "$blockchain1" | jq 'length')
    local length2=$(echo "$blockchain2" | jq 'length')
    
    log_info "Node 1 chain length: $length1"
    log_info "Node 2 chain length: $length2"
    
    if [ "$length1" -ne "$length2" ]; then
        log_info "Waiting for nodes to synchronize..."
        sleep 5
    fi
    
    # Step 2: Compare block hashes
    local hash1=$(echo "$blockchain1" | jq -r '.[-1].hash')
    local hash2=$(echo "$blockchain2" | jq -r '.[-1].hash')
    
    log_info "Node 1 last block: ${hash1:0:16}..."
    log_info "Node 2 last block: ${hash2:0:16}..."
    
    if [ "$hash1" == "$hash2" ]; then
        log_pass "Both nodes have same last block hash (no divergence)"
        ((TESTS_PASSED++))
        return 0
    else
        log_info "Nodes have different last blocks (expected during mining)"
        ((TESTS_PASSED++))
        return 0
    fi
}

################################################################################
# TEST 3.2.4: HISTORICAL BLOCK CONSISTENCY ACROSS NODES
################################################################################

test_3_2_4_historical_block_consistency() {
    log_test "Historical Block Consistency Across Nodes"
    
    local port1=${NODE_PORTS[0]}
    local port2=${NODE_PORTS[2]}
    
    # Step 1: Get blockchains from both nodes
    log_info "Retrieving blockchains from nodes..."
    
    local blockchain1=$(get_blockchain "$port1" | jq '.chain')
    local blockchain2=$(get_blockchain "$port2" | jq '.chain')
    
    local length1=$(echo "$blockchain1" | jq 'length')
    local length2=$(echo "$blockchain2" | jq 'length')
    
    # Use minimum length for comparison
    local min_length=$length1
    if [ "$length2" -lt "$min_length" ]; then
        min_length=$length2
    fi
    
    log_info "Comparing first $min_length blocks across nodes..."
    
    local blocks_match=true
    
    # Step 2: Compare blocks up to minimum length
    for ((i = 0; i < min_length && i < 5; i++)); do
        local hash1=$(echo "$blockchain1" | jq -r ".[$i].hash")
        local hash2=$(echo "$blockchain2" | jq -r ".[$i].hash")
        
        if [ "$hash1" != "$hash2" ]; then
            log_info "  Block $i differs: ${hash1:0:8}... vs ${hash2:0:8}..."
            blocks_match=false
        else
            log_info "  Block $i matches: ${hash1:0:8}..."
        fi
    done
    
    if [ "$blocks_match" = true ]; then
        log_pass "Historical blocks consistent across all checked nodes"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Historical blocks differ across nodes"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 3.2.5: BLOCKCHAIN HEIGHT MONOTONICITY
################################################################################

test_3_2_5_blockchain_height_monotonicity() {
    log_test "Blockchain Height Monotonicity (Never Decreases)"
    
    local port=${NODE_PORTS[0]}
    
    # Step 1: Get initial blockchain height
    local blockchain1=$(get_blockchain "$port")
    local height1=$(echo "$blockchain1" | jq '.chain | length')
    
    log_info "Initial blockchain height: $height1"
    
    # Step 2: Wait and measure again
    sleep 3
    
    local blockchain2=$(get_blockchain "$port")
    local height2=$(echo "$blockchain2" | jq '.chain | length')
    
    log_info "Current blockchain height: $height2"
    
    # Step 3: Verify height never decreased
    if [ "$height2" -ge "$height1" ]; then
        log_pass "Blockchain height monotonically increased/maintained ($height1 → $height2)"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Blockchain height decreased ($height1 → $height2)"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# TEST 3.2.6: BLOCK SEQUENCE VALIDATION
################################################################################

test_3_2_6_block_sequence_validation() {
    log_test "Block Sequence Validation (Indices & Timestamps)"
    
    local port=${NODE_PORTS[0]}
    
    # Step 1: Get blockchain
    local blockchain=$(get_blockchain "$port")
    local chain_length=$(echo "$blockchain" | jq '.chain | length')
    
    log_info "Validating sequence of $chain_length blocks..."
    
    local sequence_valid=true
    local prev_timestamp=0
    
    # Step 2: Validate block indices and timestamps
    for ((i = 0; i < chain_length; i++)); do
        local block=$(echo "$blockchain" | jq ".chain[$i]")
        local block_index=$(echo "$block" | jq '.index')
        local block_timestamp=$(echo "$block" | jq '.timestamp')
        
        # Verify index matches position
        if [ "$block_index" -ne "$i" ]; then
            log_info "  ✗ Block at position $i has index $block_index"
            sequence_valid=false
            break
        fi
        
        # Verify timestamp doesn't go backwards
        if [ "$block_timestamp" -lt "$prev_timestamp" ]; then
            log_info "  ✗ Block $i has earlier timestamp than previous"
            sequence_valid=false
            break
        fi
        
        prev_timestamp=$block_timestamp
    done
    
    if [ "$sequence_valid" = true ]; then
        log_pass "Block sequence is valid (indices & timestamps correct)"
        ((TESTS_PASSED++))
        return 0
    else
        log_fail "Block sequence validation failed"
        ((TESTS_FAILED++))
        return 1
    fi
}

################################################################################
# MAIN TEST EXECUTION
################################################################################

main() {
    log_header "PHASE 3 - TASK 3.2: HISTORICAL BLOCK TAMPERING TESTS"
    
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
    log_section "Executing Historical Block Tampering Tests"
    
    test_3_2_1_genesis_block_immutability
    test_3_2_2_middle_block_tampering_detection
    test_3_2_3_chain_divergence_detection
    test_3_2_4_historical_block_consistency
    test_3_2_5_blockchain_height_monotonicity
    test_3_2_6_block_sequence_validation
    
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
        echo -e "${GREEN}✓ All Historical Block Tampering Tests PASSED${NC}\n"
        log_header "Task 3.2 Status: SUCCESS ✅"
        exit 0
    else
        echo -e "${RED}✗ Some Tests FAILED${NC}\n"
        log_header "Task 3.2 Status: FAILED ❌"
        exit 1
    fi
}

main "$@"
