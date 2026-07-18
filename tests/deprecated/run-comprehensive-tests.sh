#!/bin/bash
# =============================================================================
# DEPRECATED — Preserved for reference only
# Superseded by: tests/run-tests.sh (interactive menu)
# Reason: Referenced 3 non-existent files, had division-by-zero bug in phase
#          timing, assumed services running locally (not Docker). The
#          interactive menu replaces this entirely.
# Last working: July 2026 (pre-reorganization)
# =============================================================================

#================================================
# COMPREHENSIVE TESTING SUITE RUNNER
# Executes Phase 3-5 (61 tests total)
# Attack Simulation, Malicious Detection, Recovery
#================================================

MASTER_RESULTS="COMPREHENSIVE_TEST_RESULTS.md"
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
START_EPOCH=$(date +%s)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Make all test scripts executable
chmod +x e2e/p3-attack-simulation-test.sh
chmod +x e2e/p4-malicious-detection-test.sh
chmod +x e2e/p5-recovery-resilience-test.sh

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  COMPREHENSIVE TESTING SUITE (PHASE 3-5)  ║"
echo "║  61 Tests Across 3 Phases                 ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Start Time: $START_TIME"
echo "Environment: Multi-node Byzantine FT Network (5 nodes)"
echo ""

#================================================
# PHASE 3: ATTACK SIMULATION (25 tests)
#================================================

echo -e "${MAGENTA}════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}PHASE 3: ATTACK SIMULATION (25 tests)${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════${NC}"
echo ""

PHASE3_START=$(date +%s)
bash e2e/p3-attack-simulation-test.sh
PHASE3_EXIT=$?
PHASE3_END=$(date +%s)
PHASE3_DURATION=$((PHASE3_END - PHASE3_START))

if [ $PHASE3_EXIT -eq 0 ]; then
    PHASE3_STATUS="${GREEN}✅ PASSED${NC}"
else
    PHASE3_STATUS="${RED}❌ FAILED${NC}"
fi

echo -e "Phase 3 Status: $PHASE3_STATUS (${PHASE3_DURATION}s)"
echo ""

#================================================
# PHASE 4: MALICIOUS DETECTION (18 tests)
#================================================

echo -e "${MAGENTA}════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}PHASE 4: MALICIOUS DETECTION (18 tests)${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════${NC}"
echo ""

PHASE4_START=$(date +%s)
bash e2e/p4-malicious-detection-test.sh
PHASE4_EXIT=$?
PHASE4_END=$(date +%s)
PHASE4_DURATION=$((PHASE4_END - PHASE4_START))

if [ $PHASE4_EXIT -eq 0 ]; then
    PHASE4_STATUS="${GREEN}✅ PASSED${NC}"
else
    PHASE4_STATUS="${RED}❌ FAILED${NC}"
fi

echo -e "Phase 4 Status: $PHASE4_STATUS (${PHASE4_DURATION}s)"
echo ""

#================================================
# PHASE 5: RECOVERY & RESILIENCE (18 tests)
#================================================

echo -e "${MAGENTA}════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}PHASE 5: RECOVERY & RESILIENCE (18 tests)${NC}"
echo -e "${MAGENTA}════════════════════════════════════════════${NC}"
echo ""

PHASE5_START=$(date +%s)
bash e2e/p5-recovery-resilience-test.sh
PHASE5_EXIT=$?
PHASE5_END=$(date +%s)
PHASE5_DURATION=$((PHASE5_END - PHASE5_START))

if [ $PHASE5_EXIT -eq 0 ]; then
    PHASE5_STATUS="${GREEN}✅ PASSED${NC}"
else
    PHASE5_STATUS="${RED}❌ FAILED${NC}"
fi

echo -e "Phase 5 Status: $PHASE5_STATUS (${PHASE5_DURATION}s)"
echo ""

#================================================
# EXTRACT INDIVIDUAL RESULTS
#================================================

PHASE3_RESULTS=$(grep -o "Passed:[^$]*" TEST_PHASE3_RESULTS.md 2>/dev/null | grep -o "[0-9]*" | head -1)
PHASE4_RESULTS=$(grep -o "Passed:[^$]*" TEST_PHASE4_RESULTS.md 2>/dev/null | grep -o "[0-9]*" | head -1)
PHASE5_RESULTS=$(grep -o "Passed:[^$]*" TEST_PHASE5_RESULTS.md 2>/dev/null | grep -o "[0-9]*" | head -1)

PHASE3_FAILED=$(grep -o "Failed:[^$]*" TEST_PHASE3_RESULTS.md 2>/dev/null | grep -o "[0-9]*" | head -1)
PHASE4_FAILED=$(grep -o "Failed:[^$]*" TEST_PHASE4_RESULTS.md 2>/dev/null | grep -o "[0-9]*" | head -1)
PHASE5_FAILED=$(grep -o "Failed:[^$]*" TEST_PHASE5_RESULTS.md 2>/dev/null | grep -o "[0-9]*" | head -1)

PHASE3_RATE=$(grep -o "Pass Rate:[^$]*" TEST_PHASE3_RESULTS.md 2>/dev/null | grep -o "[0-9]*" | head -1)
PHASE4_RATE=$(grep -o "Pass Rate:[^$]*" TEST_PHASE4_RESULTS.md 2>/dev/null | grep -o "[0-9]*" | head -1)
PHASE5_RATE=$(grep -o "Pass Rate:[^$]*" TEST_PHASE5_RESULTS.md 2>/dev/null | grep -o "[0-9]*" | head -1)

# Calculate totals
TOTAL_PASSED=$((${PHASE3_RESULTS:-0} + ${PHASE4_RESULTS:-0} + ${PHASE5_RESULTS:-0}))
TOTAL_FAILED=$((${PHASE3_FAILED:-0} + ${PHASE4_FAILED:-0} + ${PHASE5_FAILED:-0}))
TOTAL_TESTS=$((TOTAL_PASSED + TOTAL_FAILED))
OVERALL_RATE=$((TOTAL_PASSED * 100 / TOTAL_TESTS))

END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
END_EPOCH=$(date +%s)
TOTAL_DURATION=$((END_EPOCH - START_EPOCH))

#================================================
# COMPREHENSIVE RESULTS SUMMARY
#================================================

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║      COMPREHENSIVE TEST RESULTS            ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}Phase 3 (Attack Simulation):${NC}"
echo "  Tests Passed:  ${PHASE3_RESULTS}/25"
echo "  Tests Failed:  ${PHASE3_FAILED}/25"
echo "  Pass Rate:     ${PHASE3_RATE}%"
echo ""
echo -e "${BLUE}Phase 4 (Malicious Detection):${NC}"
echo "  Tests Passed:  ${PHASE4_RESULTS}/18"
echo "  Tests Failed:  ${PHASE4_FAILED}/18"
echo "  Pass Rate:     ${PHASE4_RATE}%"
echo ""
echo -e "${BLUE}Phase 5 (Recovery & Resilience):${NC}"
echo "  Tests Passed:  ${PHASE5_RESULTS}/18"
echo "  Tests Failed:  ${PHASE5_FAILED}/18"
echo "  Pass Rate:     ${PHASE5_RATE}%"
echo ""
echo -e "${YELLOW}═══════════════════════════════${NC}"
echo -e "${BLUE}TOTAL RESULTS (61 Tests):${NC}"
echo -e "  Total Passed:  ${GREEN}${TOTAL_PASSED}${NC}"
echo -e "  Total Failed:  ${RED}${TOTAL_FAILED}${NC}"
echo -e "  Overall Rate:  ${BLUE}${OVERALL_RATE}%${NC}"
echo -e "${YELLOW}═══════════════════════════════${NC}"
echo ""
echo "Total Duration: ${TOTAL_DURATION}s"
echo "Start Time:    $START_TIME"
echo "End Time:      $END_TIME"
echo ""

# Generate master results file
cat > "$MASTER_RESULTS" << EOF
# Comprehensive Testing Results (Phase 3-5)

**Report Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Total Tests:** 61
**Test Environment:** Multi-node Byzantine Fault Tolerant Network

## Executive Summary
...
EOF

echo "📄 Master results saved to: $MASTER_RESULTS"
echo ""

# Determine overall exit code
if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ ALL TESTS PASSED - SYSTEM PRODUCTION READY${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}═══════════════════════════════════════════${NC}"
    echo -e "${RED}❌ SOME TESTS FAILED - REVIEW REQUIRED${NC}"
    echo -e "${RED}═══════════════════════════════════════════${NC}"
    echo ""
    exit 1
fi
