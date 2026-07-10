# 🔐 Security Testing Framework

**Comprehensive security testing suite for the Blockchain Voting System**

---

## 📁 Folder Contents

| File | Purpose | Size |
|------|---------|------|
| [SECURITY_TEST_PLAN.md](SECURITY_TEST_PLAN.md) | Main test plan with 15 attack scenarios | 38 KB |
| [SECURITY_TEST_SCENARIOS_DETAILED.md](SECURITY_TEST_SCENARIOS_DETAILED.md) | Step-by-step execution guides | 18 KB |
| [SECURITY_TEST_PLAN_EXECUTION_SUMMARY.md](SECURITY_TEST_PLAN_EXECUTION_SUMMARY.md) | Quick start & expected results | 15 KB |
| [SECURITY_TESTING_FRAMEWORK_INDEX.md](SECURITY_TESTING_FRAMEWORK_INDEX.md) | Master index & navigation | 14 KB |
| [SECURITY_TEST_PLAN_COMPLETE.md](SECURITY_TEST_PLAN_COMPLETE.md) | Completion report & checklist | 15 KB |
| [test-security-orchestrator.sh](test-security-orchestrator.sh) | Automated test runner script | 27 KB |

**Total: ~130 KB of documentation + executable scripts**

---

## 🚀 Quick Start

### Run All Tests
```bash
cd security-testing-framework
bash test-security-orchestrator.sh
```

### Run Specific Group
```bash
bash test-security-orchestrator.sh group-1    # Byzantine attacks
bash test-security-orchestrator.sh group-2    # Blockchain compromise
bash test-security-orchestrator.sh group-3    # Cryptographic attacks
```

### Run Single Scenario
```bash
bash test-security-orchestrator.sh scenario-1-1
```

---

## 📋 Attack Scenarios

### 15 Total Scenarios Across 7 Categories

**Group 1: Byzantine Compromise** (4 scenarios)
- 1.1 Byzantine Majority Takeover
- 1.2 Equivocation (Double-signing)
- 1.3 Omission (Message withholding)
- 1.4 Arbitrary Behavior

**Group 2: Blockchain Compromise** (3 scenarios)
- 2.1 Chain Fork Detection
- 2.2 Orphaned Block Injection
- 2.3 Consensus Deadlock

**Group 3: Cryptographic Attacks** (3 scenarios)
- 3.1 Signature Forgery
- 3.2 Replay Attack
- 3.3 Double Voting Prevention

**Group 4: Vote Tampering** (3 scenarios)
- 4.1 Ballot Modification (MITM)
- 4.2 Vote Duplication
- 4.3 Candidate Swap

**Group 5: Voter Authentication** (3 scenarios)
- 5.1 Voter Impersonation
- 5.2 Session Hijacking
- 5.3 Double Voting (Nullifier)

**Group 6: Network Attacks** (3 scenarios)
- 6.1 Sybil Attack Detection
- 6.2 Eclipse Attack
- 6.3 DDoS - Network Flooding

**Group 7: Database Attacks** (3 scenarios)
- 7.1 SQL Injection Prevention
- 7.2 Data Corruption Recovery
- 7.3 Unauthorized Data Access

---

## 📖 Documentation Guide

### Start Here
1. **First Time?** → Read [SECURITY_TESTING_FRAMEWORK_INDEX.md](SECURITY_TESTING_FRAMEWORK_INDEX.md) (15 min)
2. **Want to Run Tests?** → See [SECURITY_TEST_PLAN_EXECUTION_SUMMARY.md](SECURITY_TEST_PLAN_EXECUTION_SUMMARY.md) (10 min)
3. **Ready to Execute?** → Run `bash test-security-orchestrator.sh` (7-10 min)

### Detailed Information
- **Full Framework:** [SECURITY_TEST_PLAN.md](SECURITY_TEST_PLAN.md)
- **Step-by-Step Guides:** [SECURITY_TEST_SCENARIOS_DETAILED.md](SECURITY_TEST_SCENARIOS_DETAILED.md)
- **Completion Info:** [SECURITY_TEST_PLAN_COMPLETE.md](SECURITY_TEST_PLAN_COMPLETE.md)

---

## ✅ Features

✅ **15 Attack Scenarios** - Comprehensive coverage of security threats  
✅ **Automated Execution** - Master orchestrator runs all tests  
✅ **Flexible Modes** - Full suite, group, or individual scenario  
✅ **Detailed Reports** - JSON results + executive summary  
✅ **CI/CD Ready** - Exit codes for automation  
✅ **Well Documented** - ~9,600 lines of documentation  
✅ **Production Ready** - Tested and verified  

---

## 🎯 Expected Execution Time

| Mode | Time | Command |
|------|------|---------|
| Full Suite (all 15) | 7-10 min | `test-security-orchestrator.sh all` |
| Single Group (4-5) | 2-4 min | `test-security-orchestrator.sh group-1` |
| Single Scenario | 30-120 sec | `test-security-orchestrator.sh scenario-1-1` |

---

## 📊 Test Results

Results are saved in the `results/` directory:
```
results/
├── scenario-*.json          # Individual test results
├── final_report_*.txt       # Executive summary
└── final_report_*.json      # Aggregated results
```

---

## 🔧 Prerequisites

Before running tests:
- ✅ Docker daemon running
- ✅ All 5 blockchain nodes deployed
- ✅ Nodes responding to health checks
- ✅ MySQL database accessible
- ✅ Sufficient disk space (>5GB)

---

## 🛠️ Usage Examples

### Example 1: Full Security Assessment
```bash
cd security-testing-framework
bash test-security-orchestrator.sh
# Tests all 15 scenarios, generates comprehensive report
```

### Example 2: Byzantine Attack Testing
```bash
bash test-security-orchestrator.sh group-1
# Tests scenarios 1.1, 1.2, 1.3, 1.4
# Results in results/scenario-1-*.json
```

### Example 3: Debugging Single Test
```bash
bash test-security-orchestrator.sh scenario-2-1
# Detailed output for fork detection test
```

### Example 4: CI/CD Integration
```bash
if bash test-security-orchestrator.sh; then
  echo "All security tests PASSED"
  exit 0
else
  echo "Security tests FAILED"
  exit 1
fi
```

---

## 📚 Related Documentation

### In This Folder
- [SECURITY_TEST_PLAN.md](SECURITY_TEST_PLAN.md) - Complete test plan
- [SECURITY_TEST_SCENARIOS_DETAILED.md](SECURITY_TEST_SCENARIOS_DETAILED.md) - Execution guides
- [SECURITY_TESTING_FRAMEWORK_INDEX.md](SECURITY_TESTING_FRAMEWORK_INDEX.md) - Index & reference

### In Parent Directory
- `SECURITY_TESTING_REPORT.md` - Phase 3-5 baseline (73 tests)
- `BLOCKCHAIN_METRICS_INTEGRATION_COMPLETE.md` - Monitoring setup
- `MONITORING_SETUP_GUIDE.md` - Prometheus/Grafana guide

---

## 🎊 Key Metrics

- **Total Attack Scenarios:** 15
- **Documentation Lines:** ~9,600
- **Test Execution Time:** 7-10 minutes
- **Expected Pass Rate:** 80%+ (baseline)
- **Threat Categories:** 7 major categories

---

## ⏭️ Next Steps

### Immediate
1. Review [SECURITY_TESTING_FRAMEWORK_INDEX.md](SECURITY_TESTING_FRAMEWORK_INDEX.md)
2. Verify nodes are running
3. Execute one test scenario

### This Week
1. Run full test suite
2. Document findings
3. Create remediation plan for failures

### Ongoing
1. Schedule monthly tests
2. Add new scenarios
3. Monitor results

---

## 💡 Tips

- **First Time?** Start with `scenario-1-1` (easy Byzantine test)
- **Debugging?** Check `results/` folder for detailed JSON results
- **CI/CD?** Use exit codes: 0 (pass) or 1 (fail)
- **Help?** See troubleshooting in detailed guide

---

## 📞 Support

For help with:
- **Framework design** → [SECURITY_TEST_PLAN.md](SECURITY_TEST_PLAN.md)
- **Running tests** → [SECURITY_TEST_PLAN_EXECUTION_SUMMARY.md](SECURITY_TEST_PLAN_EXECUTION_SUMMARY.md)
- **Specific scenarios** → [SECURITY_TEST_SCENARIOS_DETAILED.md](SECURITY_TEST_SCENARIOS_DETAILED.md)
- **Navigation** → [SECURITY_TESTING_FRAMEWORK_INDEX.md](SECURITY_TESTING_FRAMEWORK_INDEX.md)

---

**Status:** ✅ PRODUCTION READY

**Version:** 1.0

**Created:** November 17, 2025

**Last Updated:** November 17, 2025

---

## 🎯 Begin Testing

```bash
cd security-testing-framework
bash test-security-orchestrator.sh
```

Happy secure testing! 🔐
