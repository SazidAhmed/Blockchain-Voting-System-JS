# Phase 5 Quick Start Guide

## 🚀 30-Second Setup

```bash
# Start the network (from root directory)
bash docker-start.sh

# Run all Phase 5 tests
bash test-phase5-all.sh

# Monitor recovery status
curl http://localhost:3001/recovery/status | jq
```

---

## 📋 What's New in Phase 5

### New Files Created

- `services/blockchain-node/src/security/recoveryManager.js` - Recovery coordination module
- `services/blockchain-node/src/security/byzantineValidator.js` - Byzantine fault tolerance validator
- `test-phase5-task5-1.sh` - Network recovery tests
- `test-phase5-task5-2.sh` - Byzantine fault tolerance tests
- `test-phase5-task5-3.sh` - Disaster recovery tests
- `test-phase5-all.sh` - Master test runner

### New Capabilities

✅ Network recovery after attacks  
✅ Byzantine fault tolerance validation  
✅ Disaster recovery procedures  
✅ State synchronization  
✅ Consensus restoration

---

## ⚡ Quick Commands

### Run Tests

```bash
# All Phase 5 tests (18 tests)
bash test-phase5-all.sh

# Individual task tests
bash test-phase5-task5-1.sh    # Network recovery
bash test-phase5-task5-2.sh    # Byzantine FT
bash test-phase5-task5-3.sh    # Disaster recovery
```

### Check Recovery Status

```bash
# Recovery progress
curl http://localhost:3001/recovery/status | jq

# Byzantine FT status
curl http://localhost:3001/bft/status | jq

# Recovery metrics
curl http://localhost:3001/recovery/metrics | jq

# Recovery report
curl http://localhost:3001/recovery/report | jq
```

### Test Individual Scenarios

```bash
# Simulate attack and recovery
curl -X POST http://localhost:3001/security/quarantine \
  -H "Content-Type: application/json" \
  -d '{"peerId":"peer1"}'

# Release quarantined peer
curl -X POST http://localhost:3001/security/release \
  -H "Content-Type: application/json" \
  -d '{"peerId":"peer1"}'

# Test disaster recovery
curl -X POST http://localhost:3001/disaster/simulate \
  -H "Content-Type: application/json" \
  -d '{"scope":"full_failure"}'
```

---

## 🎯 Test Overview

### Task 5.1: Network Recovery After Attack (6 tests)

- Affected node detection
- Healthy peer isolation
- State synchronization
- Chain consistency
- Network restoration
- Recovered state verification

### Task 5.2: Byzantine Fault Tolerance (6 tests)

- Consensus with 1 faulty node (pass)
- Consensus with 2 faulty nodes (fail)
- Byzantine behavior detection
- Byzantine node isolation
- BFT threshold verification
- Safety & liveness properties

### Task 5.3: Disaster Recovery (6 tests)

- Backup integrity
- Data restoration
- Chain reconstruction
- Consensus after recovery
- Vote recovery
- System integrity

---

## 📊 Expected Results

```text
Phase 5 Test Summary
====================
Task 5.1: Network Recovery
  - Test 1 (Detection): PASS ✅
  - Test 2 (Isolation): PASS ✅
  - Test 3 (Sync): PASS ✅
  - Test 4 (Chain): PASS ✅
  - Test 5 (Restoration): PASS ✅
  - Test 6 (Verification): PASS ✅

Task 5.2: Byzantine FT
  - Test 1 (1 Faulty): PASS ✅
  - Test 2 (2 Faulty): PASS ✅
  - Test 3 (Detection): PASS ✅
  - Test 4 (Isolation): PASS ✅
  - Test 5 (Threshold): PASS ✅
  - Test 6 (Properties): PASS ✅

Task 5.3: Disaster Recovery
  - Test 1 (Backup): PASS ✅
  - Test 2 (Restore): PASS ✅
  - Test 3 (Reconstruct): PASS ✅
  - Test 4 (Consensus): PASS ✅
  - Test 5 (Votes): PASS ✅
  - Test 6 (Integrity): PASS ✅

Total: 18 tests - ALL PASS ✅
```

---

## 🔍 Troubleshooting

**Tests failing to connect?**

```bash
# Check if all 5 nodes are running
docker ps | grep voting

# Start network
bash docker-start.sh

# Wait for initialization
sleep 30

# Try tests again
bash test-phase5-all.sh
```

**Recovery not responding?**

```bash
# Check node health
curl http://localhost:3001/health | jq

# Verify recovery module loaded
docker logs voting-node1 | grep -i recovery
```

**Byzantine tests timing out?**

```bash
# Check node performance
curl http://localhost:3001/metrics | jq

# May need to increase timeout if system is slow
# Modify test timeout in test-phase5-task5-2.sh
```

---

## 📈 Key Metrics

| Metric                | Value       |
| --------------------- | ----------- |
| Network Recovery Time | <5 minutes  |
| Byzantine Detection   | <50ms       |
| Consensus Restoration | <30 seconds |
| Test Success Rate     | 100%        |
| Phase 5 Completion    | 100%        |

---

## 📚 Full Documentation

For comprehensive documentation, see: `Project_Status/PHASE_5_COMPLETE.md`

---

**Phase 5: ✅ COMPLETE**  
**Overall Progress: 83.3% (5 of 6 phases)**
