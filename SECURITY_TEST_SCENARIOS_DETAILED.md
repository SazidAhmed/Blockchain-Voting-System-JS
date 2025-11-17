# 🎯 Security Test Scenarios - Detailed Reference

**Comprehensive Attack Testing Guide**

**Date:** November 17, 2025  
**Version:** 2.0

---

## Quick Reference

| Scenario | Attack Type | Difficulty | Risk Level | Status |
|----------|------------|------------|-----------|--------|
| 1.1 | Byzantine Majority | Hard | Critical | 📋 |
| 1.2 | Equivocation | Medium | High | 📋 |
| 1.3 | Omission | Medium | High | 📋 |
| 1.4 | Arbitrary Behavior | Medium | High | 📋 |
| 2.1 | Chain Fork | Medium | Critical | 📋 |
| 2.2 | Orphaned Blocks | Easy | Medium | 📋 |
| 2.3 | Consensus Deadlock | Hard | Critical | 📋 |
| 3.1 | Signature Forgery | Easy | High | 📋 |
| 3.2 | Replay Attack | Easy | High | 📋 |
| 3.3 | Double Voting | Easy | Medium | 📋 |
| 4.1 | Sybil Attack | Medium | Medium | 📋 |
| 5.1 | XSS Injection | Easy | Low | 📋 |

---

## Detailed Scenarios

### SCENARIO 1.1: Byzantine Majority Takeover

**Category:** Byzantine Compromise Attacks  
**Complexity:** ⭐⭐⭐⭐ (Hard)  
**Risk Level:** 🔴 CRITICAL

#### Objective
Test system behavior when 2 out of 3 validators are compromised, giving attacker 2/3 voting power. This exceeds the Byzantine fault tolerance threshold.

#### Prerequisites
- 5-node network (3 validators, 2 observers) running
- Network connectivity verified
- All nodes in healthy state
- Baseline metrics collected

#### Attack Execution

**Step 1: Preparation (1 min)**
```bash
# Record baseline metrics
curl http://localhost:3001/api/blockchain/stats > baseline_node1.json
curl http://localhost:3002/api/blockchain/stats > baseline_node2.json
curl http://localhost:3003/api/blockchain/stats > baseline_node3.json
curl http://localhost:3004/api/blockchain/stats > baseline_node4.json
curl http://localhost:3005/api/blockchain/stats > baseline_node5.json

# Verify all nodes agree on chain height
curl http://localhost:3001/api/blockchain/height
curl http://localhost:3002/api/blockchain/height
curl http://localhost:3003/api/blockchain/height
```

**Step 2: Compromise node1 & node2 (2 min)**
```bash
# Inject malicious code into node1 (or simulate via API)
curl -X POST http://localhost:3001/api/test/set-byzantine \
  -H "Content-Type: application/json" \
  -d '{"behavior": "majority_attack", "targetNodes": [1, 2]}'

# Verify Byzantine mode activated
curl http://localhost:3001/api/test/status
# Expected: {"byzantineMode": true, "behavior": "majority_attack"}

# Inject same malicious code into node2
curl -X POST http://localhost:3002/api/test/set-byzantine \
  -H "Content-Type: application/json" \
  -d '{"behavior": "majority_attack", "partner": "node1"}'
```

**Step 3: Create Invalid Block (1 min)**
```bash
# Node1 creates block with invalid votes (fake voters)
BLOCK_PAYLOAD=$(cat << 'EOF'
{
  "height": 100,
  "timestamp": "2025-11-17T10:00:00Z",
  "parentHash": "0x1234567890abcdef",
  "votes": [
    {"voterId": "fake_voter_1", "candidate": "HACKER_A"},
    {"voterId": "fake_voter_2", "candidate": "HACKER_B"},
    {"voterId": "fake_voter_3", "candidate": "HACKER_C"}
  ],
  "miner": "node1",
  "signature": "0x...node1_signature..."
}
EOF
)

# Broadcast to network
curl -X POST http://localhost:3001/api/blockchain/submit-block \
  -H "Content-Type: application/json" \
  -d "$BLOCK_PAYLOAD"

# Node2 (also Byzantine) validates and accepts
curl -X POST http://localhost:3002/api/blockchain/validate-block \
  -H "Content-Type: application/json" \
  -d "$BLOCK_PAYLOAD"
```

**Step 4: Monitor System Response (3 min)**
```bash
# Poll consensus status
for i in {1..10}; do
  echo "Check $i:"
  curl http://localhost:3003/api/blockchain/stats
  sleep 3
done

# Check if node3 accepts/rejects invalid block
curl http://localhost:3003/api/blockchain/height
curl http://localhost:3003/api/blockchain/latest-block

# Check forensic logs
curl http://localhost:3001/api/security/forensics
curl http://localhost:3003/api/security/forensics
```

#### Expected Outcomes

**✅ Secure Response (System Passes)**
```json
{
  "node3_height": 99,
  "node1_height": 100,
  "node2_height": 100,
  "consensus_status": "SPLIT",
  "node3_decision": "REJECTED",
  "reason": "Invalid votes detected",
  "detection_time_ms": 87,
  "quarantine_triggered": true,
  "quarantined_nodes": ["node1", "node2"],
  "recovery_status": "IN_PROGRESS"
}
```

**❌ Vulnerable Response (System Fails)**
```json
{
  "node3_height": 100,
  "all_nodes_height": 100,
  "consensus_status": "AGREED",
  "problem": "Byzantine block accepted by honest node",
  "malicious_votes": 3,
  "valid_votes": 0
}
```

#### Validation Checklist

- [ ] Invalid block created with fake voter IDs
- [ ] node1 and node2 sign block (Byzantine collusion)
- [ ] node3, node4, node5 receive block
- [ ] Block signature verification succeeds (technically valid)
- [ ] Block content validation FAILS (fake voters)
- [ ] node3/4/5 reject block immediately
- [ ] Consensus continues without node1/2 (3-2 split)
- [ ] Byzantine nodes quarantined
- [ ] Forensic record created with evidence
- [ ] System remains stable

#### Forensic Analysis Points

1. **Timeline Reconstruction:**
   - T+0s: Block injected
   - T+0.087s: Signature verified ✅
   - T+0.089s: Content validation FAILED ❌
   - T+0.150s: Quarantine triggered

2. **Evidence Collection:**
   - Invalid voter IDs in block data
   - node1 and node2 signatures on same block
   - Timestamp sequence analysis
   - Message routing records

3. **Recovery Confirmation:**
   - All 5 nodes reach consensus (without node1/2)
   - Chain height consistent across nodes
   - No fork created

#### Success Metrics

| Metric | Target | Result |
|--------|--------|--------|
| Detection Latency | <150ms | ? |
| False Positive Rate | 0% | ? |
| System Availability | >99% | ? |
| Recovery Time | <30s | ? |
| Data Integrity | 100% | ? |

#### Lessons & Implications

**If Scenario PASSES:**
- ✅ Content validation layer working correctly
- ✅ Byzantine fault tolerance effective
- ✅ Quorum consensus prevents takeover
- ✅ System resilient to 2/3 compromise

**If Scenario FAILS:**
- ❌ Cryptographic signature alone insufficient
- ❌ Need better content validation
- ❌ Quorum calculation needs review
- ⚠️ Critical vulnerability: 2/3 nodes can inject invalid data

---

### SCENARIO 1.2: Equivocation (Double-Signing)

**Category:** Byzantine Compromise Attacks  
**Complexity:** ⭐⭐⭐ (Medium)  
**Risk Level:** 🟡 HIGH

#### Objective
Byzantine node node2 signs TWO different blocks at the same height, causing conflicting versions to propagate through network.

#### Attack Steps

```bash
# Step 1: Create two different blocks for height 50
BLOCK_A=$(cat << 'EOF'
{
  "height": 50,
  "hash": "0xAAAA...",
  "data": "Valid Transaction Data",
  "timestamp": "2025-11-17T10:00:00Z",
  "parentHash": "0x4949...",
  "miner": "node2"
}
EOF
)

BLOCK_B=$(cat << 'EOF'
{
  "height": 50,
  "hash": "0xBBBB...",
  "data": "Different Data - Fraudulent",
  "timestamp": "2025-11-17T10:00:01Z",
  "parentHash": "0x4949...",
  "miner": "node2"
}
EOF
)

# Step 2: Sign block A with node2's private key
SIG_A=$(sign_block_with_key "node2.key" "$BLOCK_A")
SIGNED_BLOCK_A=$(add_signature "$BLOCK_A" "$SIG_A" "node2")

# Step 3: Sign block B with SAME node2 private key
SIG_B=$(sign_block_with_key "node2.key" "$BLOCK_B")
SIGNED_BLOCK_B=$(add_signature "$BLOCK_B" "$SIG_B" "node2")

# Step 4: Broadcast block A to some peers (node1, node4)
curl -X POST http://localhost:3001/api/blockchain/receive-block \
  -d "$SIGNED_BLOCK_A"
curl -X POST http://localhost:3004/api/blockchain/receive-block \
  -d "$SIGNED_BLOCK_A"

sleep 2

# Step 5: Broadcast block B to other peers (node3, node5)
curl -X POST http://localhost:3003/api/blockchain/receive-block \
  -d "$SIGNED_BLOCK_B"
curl -X POST http://localhost:3005/api/blockchain/receive-block \
  -d "$SIGNED_BLOCK_B"

sleep 2

# Step 6: Monitor detection
curl http://localhost:3001/api/security/forensics | jq '.detections[] | select(.type=="EQUIVOCATION")'
```

#### Expected Detection

```json
{
  "detection_type": "EQUIVOCATION",
  "perpetrator": "node2",
  "behavior_description": "Signed two conflicting blocks at same height",
  "evidence": {
    "blockHash1": "0xAAAA...",
    "blockHash2": "0xBBBB...",
    "height": 50,
    "signature1": "valid",
    "signature2": "valid",
    "both_signed_by": "node2"
  },
  "detection_time_ms": 234,
  "severity": "CRITICAL",
  "action_taken": "node2_quarantined",
  "network_status": "RECOVERY"
}
```

#### Validation Points

- [ ] Both blocks have valid signatures from node2
- [ ] Both blocks have same height (50)
- [ ] Block hashes differ (conflicting data)
- [ ] Network receives both versions
- [ ] Equivocation detected automatically
- [ ] node2 reputation score decreased significantly
- [ ] node2 quarantined from consensus
- [ ] Canonical block selected (likely Block A based on timestamp)
- [ ] Other nodes reach consensus on canonical block

---

### SCENARIO 3.1: Signature Forgery

**Category:** Cryptographic Attacks  
**Complexity:** ⭐⭐ (Easy)  
**Risk Level:** 🟡 HIGH

#### Objective
Test ECDSA signature verification by attempting to forge a block signature.

#### Attack Code

```javascript
// Step 1: Create a valid block structure
const block = {
  height: 100,
  timestamp: Date.now(),
  transactions: [{
    id: "tx_001",
    from: "voter_123",
    to: "system",
    data: "vote_for_candidate_A"
  }],
  parentHash: "0x1234567890abcdef",
  miner: "attacker_node"
};

// Step 2: Compute block hash
const blockHash = sha256(JSON.stringify(block));
console.log("Block Hash:", blockHash);

// Step 3: Create INVALID/FORGED signature
const forgedSignature = "0x" + 
  randomBytes(32).toString('hex') + 
  randomBytes(32).toString('hex');

console.log("Forged Signature:", forgedSignature);

// Step 4: Attach forged signature to block
block.signature = forgedSignature;
block.miner = "node1"; // Impersonate node1

// Step 5: Broadcast to network
const response = await fetch('http://localhost:3001/api/blockchain/submit-block', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(block)
});

console.log("Response:", response.json());
// Expected: {status: "REJECTED", reason: "Invalid signature"}
```

#### Expected Behavior

```
✅ PASS:
  - Signature verification fails
  - Block rejected immediately
  - Error: "Signature verification failed for block X"
  - No state update
  - Forensic record created

❌ FAIL:
  - Block accepted despite invalid signature
  - Block added to chain
  - State corrupted
```

#### Validation

```bash
# Check if forged block was rejected
curl http://localhost:3001/api/blockchain/height
# Should NOT have changed if block was rejected

# Check forensics
curl http://localhost:3001/api/security/forensics | \
  jq '.rejectedBlocks[] | select(.reason == "Signature verification failed")'
```

---

### SCENARIO 4.1: Ballot Modification (MITM Attack)

**Category:** Vote Tampering Attacks  
**Complexity:** ⭐⭐⭐ (Medium)  
**Risk Level:** 🟡 HIGH

#### Objective
Test detection of encrypted ballot modification in transit between frontend and backend.

#### Attack Scenario

```bash
# Step 1: Legitimate user votes in frontend
# (User selects "Candidate A" and submits)
# Frontend encrypts and signs ballot

# Step 2: Attacker intercepts HTTP request
# (Using network proxy, MITM, or router control)

# Step 3: Attacker modifies encrypted ballot
# Original ballot (hex):
ORIG_BALLOT="a1b2c3d4e5f6g7h8i9j0"

# Attacker flips bits (simulating corruption)
MODIFIED_BALLOT="a1b2c3d4e5f6g7h8i9j1"  # Last byte differs

# Step 4: Forward modified ballot to backend
curl -X POST http://localhost:3000/api/votes/submit \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedBallot": "a1b2c3d4e5f6g7h8i9j1",
    "signature": "original_user_signature",
    "publicKey": "user_public_key"
  }'

# Step 5: Backend verifies
# Expected behavior:
# - Signature verification: FAILS
#   (signature was on original ballot, not modified one)
# - Vote rejected
# - Attempt logged
```

#### Cryptographic Protection

```
Normal flow:
1. User: encryptedBallot = encrypt(vote)
2. User: signature = sign(encryptedBallot, privateKey)
3. Backend: Verify signature with publicKey
4. If ballot modified: signature verification FAILS

Attack blocked by:
✅ Signature includes ballot content
✅ Any bit change breaks signature
✅ Attacker can't re-sign (no private key)
```

#### Validation

```bash
# Check vote was rejected
curl http://localhost:3000/api/votes/status \
  -d '{"voteId": "test_vote_001"}'
# Expected: {status: "REJECTED", reason: "Signature mismatch"}

# Check forensic log
curl http://localhost:3001/api/security/forensics | \
  jq '.tamperingAttempts[]'
```

---

## Running Tests

### Manual Execution

```bash
# Run single scenario
./run-security-test.sh scenario-1-1

# Run group of scenarios
./run-security-test.sh group-1

# Run all scenarios
./run-security-test.sh all
```

### Automated Execution

```bash
# Run with master orchestrator (creates detailed reports)
bash test-security-orchestrator.sh

# Run with verbose logging
LOG_LEVEL=debug test-security-orchestrator.sh

# Run specific group only
test-security-orchestrator.sh group-2
```

### Docker-Based Testing

```bash
# Build test container
docker build -f Dockerfile.security-tests -t voting-security-tests .

# Run tests in container
docker run --network voting-blockchain-network \
  -v $(pwd)/test-results:/results \
  voting-security-tests \
  bash test-security-orchestrator.sh

# Run single scenario in container
docker run --network voting-blockchain-network \
  voting-security-tests \
  bash test-security-orchestrator.sh scenario-1-1
```

---

## Results Interpretation

### Pass Criteria

```
✅ PASS: Scenario test successful
  - Attack correctly detected
  - Appropriate response triggered
  - System remains stable
  - No data corruption

⚠️ PARTIAL: Some aspects working
  - Attack detected but slowly
  - Response incomplete
  - System recovered but delayed
  
❌ FAIL: Scenario test failed
  - Attack not detected
  - Inappropriate response
  - System corrupted
  - Critical vulnerability exposed
```

### Sample Result

```json
{
  "scenario": "scenario-1-1-byzantine-takeover",
  "timestamp": "2025-11-17T10:30:00Z",
  "status": "PASSED",
  "duration_seconds": 45,
  "metrics": {
    "attack_execution_time_ms": 150,
    "detection_time_ms": 87,
    "remediation_time_ms": 234,
    "recovery_time_ms": 890,
    "total_time_ms": 1361
  },
  "findings": {
    "vulnerability_found": false,
    "system_stable": true,
    "data_integrity": "VERIFIED",
    "consensus_restored": true
  },
  "evidence": [
    {
      "timestamp": "2025-11-17T10:30:00.150Z",
      "event": "Byzantine block injected",
      "details": "Invalid voter IDs"
    },
    {
      "timestamp": "2025-11-17T10:30:00.237Z",
      "event": "Detection triggered",
      "details": "Signature valid but content invalid"
    },
    {
      "timestamp": "2025-11-17T10:30:00.471Z",
      "event": "Quarantine initiated",
      "details": "Nodes 1,2 isolated"
    }
  ]
}
```

---

## Troubleshooting

### Scenario Not Starting

```bash
# Check if nodes are running
docker ps | grep blockchain-node

# Check node health
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health

# Check network connectivity
docker network inspect voting-blockchain-network

# Restart all nodes
docker-compose -f docker-compose.multi-node.yml restart
```

### Attack Not Detected

```bash
# Check security monitoring active
curl http://localhost:3001/api/security/status
# Expected: {"monitoring": true, "status": "ACTIVE"}

# Check forensic collection enabled
curl http://localhost:3001/api/security/config
# Expected: {"forensics": true, "quarantine": true}

# Review logs
docker logs voting-blockchain-node-1 | grep -i security
docker logs voting-blockchain-node-1 | grep -i "byzantine\|attack"
```

### Database Issues

```bash
# Check MySQL connectivity
docker exec voting-mysql \
  mysql -u root -ppassword voting_db -e "SELECT COUNT(*) FROM votes;"

# Clear test data
docker exec voting-mysql \
  mysql -u root -ppassword voting_db \
  -e "DELETE FROM votes WHERE voter_id LIKE 'test_%';"

# Reset to baseline
docker exec voting-mysql \
  mysql -u root -ppassword voting_db < /setup/baseline.sql
```

---

## Next Steps

### After Running Tests

1. **Analyze Results**
   - Review all FAILED scenarios
   - Understand root causes
   - Document vulnerabilities

2. **Prioritize Fixes**
   - CRITICAL: Fix immediately
   - HIGH: Fix within 1 week
   - MEDIUM: Fix within 1 month
   - LOW: Fix in next release

3. **Implement Fixes**
   - Code changes
   - Configuration updates
   - Security patches

4. **Re-test**
   - Run fixed scenarios
   - Ensure no regressions
   - Verify full recovery

5. **Schedule Recurring**
   - Run tests monthly
   - Add new scenarios
   - Update attack vectors

---

**Document Maintained By:** Security Team  
**Last Updated:** November 17, 2025  
**Next Review:** After first test execution
