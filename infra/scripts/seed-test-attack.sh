#!/bin/bash
# Seed data for attack tests: base data + tamper scenarios.
# Some attack data (tampered blocks, double-spend records) is created
# by the attack test scripts directly via blockchain node API.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}=== Seed: Attack Test Data ===${NC}"

"$SCRIPT_DIR/seed-test-integration.sh"

echo -e "${GREEN}✓ Base attack data seeded. Tampered state created by attack tests.${NC}"
