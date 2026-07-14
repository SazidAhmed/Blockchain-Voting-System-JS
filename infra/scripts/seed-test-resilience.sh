#!/bin/bash
# Seed data for resilience tests: base data + recovery scenarios.
# Multi-node partition state and recovery data are created
# by the resilience test scripts directly.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}=== Seed: Resilience Test Data ===${NC}"

"$SCRIPT_DIR/seed-test-integration.sh"

echo -e "${GREEN}✓ Base resilience data seeded. Recovery state created by resilience tests.${NC}"
