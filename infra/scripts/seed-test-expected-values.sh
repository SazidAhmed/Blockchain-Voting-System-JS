#!/bin/bash
# Expected values for test assertions — sourced by seed scripts.
# Reuses test-config.sh for URLs, auth, jq.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../tests/test-config.sh"

# Admin credentials (from seed.js)
SEED_ADMIN_ID="ADMIN001"
SEED_ADMIN_PASS="admin123"

# Test voter credentials
SEED_VOTER_ID="STU00001"
SEED_VOTER_PASS="${SEED_VOTER_PASS:-DemoPass123!}"
SEED_VOTER_EMAIL="${SEED_VOTER_EMAIL:-demo-voter@university.edu}"

# Expected election counts (after comprehensive seed)
EXPECTED_ELECTION_COUNT=3
EXPECTED_ACTIVE_COUNT=1

# Expected vote counts
EXPECTED_VOTE_COUNT_AFTER_SEED=0
EXPECTED_VOTE_COUNT_AFTER_SMOKE=1
