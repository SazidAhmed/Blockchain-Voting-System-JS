#!/bin/bash
# Seed data for malicious detection tests: base data + detection scenarios.
# Byzantine node config and suspicious activity logs are created
# by the detection test scripts directly.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}=== Seed: Detection Test Data ===${NC}"

"$SCRIPT_DIR/seed-test-integration.sh"

echo -e "${GREEN}✓ Base detection data seeded. Malicious state created by detection tests.${NC}"
