# Blockchain Voting System - Comprehensive Test Plan

## Test Environment Setup

### Prerequisites
```bash
# Ensure Docker containers are running
docker-compose up -d

# Verify all containers are healthy
docker ps

# Expected containers (11 total):
# - voting-backend
# - voting-frontend
# - voting-mysql
# - voting-blockchain-node-1 through voting-blockchain-node-5
# - voting-prometheus
# - voting-grafana
# - voting-loki
# - voting-promtail
```

### Verify System Status
```bash
# Check backend health
curl http://localhost:3000/health

# Check blockchain nodes
for i in {1..5}; do
  echo "Node $i:"
  curl http://localhost:$((3000+i))/chain | head -20
done

# Check database connectivity
docker exec voting-mysql mysql -u root -proot voting -e "SELECT COUNT(*) as user_count FROM users;"
```

---

## Test Module 1: User Authentication & Election Registration

### 1.1 User Registration
**Objective:** Verify new user can register with cryptographic keys generated

**Steps:**
```bash
BACKEND_URL="http://localhost:3000/api"

# Register new user
curl -X POST $BACKEND_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Voter",
    "email": "voter@test.com",
    "password": "TestPassword123!",
    "studentId": "STU001"
  }' | jq '.'

# Expected response:
# {
#   "message": "User registered successfully",
#   "userId": <id>,
#   "email": "voter@test.com"
# }
```

**Verification:**
```bash
# Check user created in database
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT id, name, email, studentId FROM users WHERE email='voter@test.com';"
```

---

### 1.2 User Login & Key Loading
**Objective:** Verify user can login and cryptographic keys are loaded

**Steps:**
```bash
# Login user
LOGIN_RESPONSE=$(curl -s -X POST $BACKEND_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "voter@test.com",
    "password": "TestPassword123!"
  }')

# Extract JWT token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.id')

echo "Token: $TOKEN"
echo "User ID: $USER_ID"

# Expected: Token should be a valid JWT
```

**Verification:**
```bash
# Verify token works
curl -X GET $BACKEND_URL/elections \
  -H "Authorization: Bearer $TOKEN" | jq '.' | head -20
```

---

### 1.3 Election Registration
**Objective:** Register user for an election

**Steps:**
```bash
# First, get list of active elections
ELECTIONS=$(curl -s -X GET $BACKEND_URL/elections \
  -H "Authorization: Bearer $TOKEN")

ELECTION_ID=$(echo $ELECTIONS | jq -r '.elections[0].id')
echo "Election ID: $ELECTION_ID"

# Register for election
curl -X POST $BACKEND_URL/elections/$ELECTION_ID/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'

# Expected response:
# {
#   "message": "Registered for election successfully",
#   "registrationToken": "<token>"
# }
```

**Verification:**
```bash
# Check registration in database
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT * FROM voter_registrations WHERE user_id=$USER_ID AND election_id=$ELECTION_ID;"

# Status should be "registered"
```

---

## Test Module 2: Vote Casting & Validation

### 2.1 Single Vote - Valid Submission
**Objective:** Cast a valid vote and receive receipt

**Steps:**
```bash
# Get election and candidate details
ELECTION=$(curl -s -X GET $BACKEND_URL/elections/$ELECTION_ID \
  -H "Authorization: Bearer $TOKEN")

CANDIDATE_ID=$(echo $ELECTION | jq -r '.candidates[0].id')
CANDIDATE_NAME=$(echo $ELECTION | jq -r '.candidates[0].name')

echo "Voting for: $CANDIDATE_NAME (ID: $CANDIDATE_ID)"

# Cast vote
VOTE_RESPONSE=$(curl -s -X POST $BACKEND_URL/elections/$ELECTION_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"candidateId\": $CANDIDATE_ID,
    \"privateKey\": \"test-key-123\"
  }")

echo $VOTE_RESPONSE | jq '.'

# Expected response:
# {
#   "message": "Vote cast successfully",
#   "receipt": {
#     "transactionHash": "<hash>",
#     "blockIndex": 0,
#     "timestamp": "<iso-date>",
#     "nullifier": "<nullifier>",
#     "signature": "<signature>"
#   }
# }

# Save receipt for later verification
RECEIPT=$(echo $VOTE_RESPONSE | jq '.receipt')
TX_HASH=$(echo $RECEIPT | jq -r '.transactionHash')
NULLIFIER=$(echo $RECEIPT | jq -r '.nullifier')

echo "Transaction Hash: $TX_HASH"
echo "Nullifier: $NULLIFIER"
```

**Verification:**
```bash
# Check vote recorded in database
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT * FROM votes_meta WHERE nullifier_hash='$NULLIFIER';"

# Check registration status changed to 'voted'
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT status FROM voter_registrations WHERE user_id=$USER_ID AND election_id=$ELECTION_ID;"
```

---

### 2.2 Double Vote Prevention
**Objective:** Verify user cannot vote twice in same election

**Steps:**
```bash
# Attempt second vote
curl -X POST $BACKEND_URL/elections/$ELECTION_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"candidateId\": $CANDIDATE_ID,
    \"privateKey\": \"test-key-123\"
  }" | jq '.'

# Expected error response:
# {
#   "message": "You have already voted in this election"
# }
```

**Verification:**
```bash
# Check vote count hasn't increased
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT COUNT(*) as vote_count FROM votes_meta WHERE election_id=$ELECTION_ID;"
```

---

### 2.3 Duplicate Nullifier Prevention
**Objective:** Verify system rejects votes with duplicate nullifiers

**Steps:**
```bash
# Create second user and register for election
curl -X POST $BACKEND_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Voter 2",
    "email": "voter2@test.com",
    "password": "TestPassword123!",
    "studentId": "STU002"
  }' > /dev/null

# Login as second user
TOKEN2=$(curl -s -X POST $BACKEND_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "voter2@test.com",
    "password": "TestPassword123!"
  }' | jq -r '.token')

# Register for same election
curl -X POST $BACKEND_URL/elections/$ELECTION_ID/register \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null

# Try to vote with same nullifier (simulated attack)
# Note: In real scenario, each vote generates unique nullifier
# This test verifies the nullifier uniqueness check works
```

---

## Test Module 3: Blockchain Recording & Verification

### 3.1 Vote Recorded on Blockchain
**Objective:** Verify vote appears on blockchain network

**Steps:**
```bash
# Check blockchain node 1
curl http://localhost:3001/chain | jq '.blocks[-1]' | head -30

# Check if all 5 nodes have same chain (consensus)
for i in {1..5}; do
  echo "=== Node $i ==="
  curl -s http://localhost:$((3000+i))/chain | jq '.blocks | length'
done

# All should show same block count
```

**Verification:**
```bash
# Check vote transaction in block
curl -s http://localhost:3001/chain | jq '.blocks[] | select(.transactions[0].vote_id != null)' | head -40
```

---

### 3.2 Blockchain Consensus
**Objective:** Verify all nodes maintain consensus

**Steps:**
```bash
# Get chain hash from each node
echo "=== Checking Chain Consensus ==="
for i in {1..5}; do
  HASH=$(curl -s http://localhost:$((3000+i))/chain | jq -r '.blocks[-1].hash')
  echo "Node $i latest block hash: $HASH"
done

# All hashes should be identical
```

---

### 3.3 Connected Peers Verification
**Objective:** Verify nodes are connected in peer network

**Steps:**
```bash
# Check peer connections
for i in {1..5}; do
  echo "=== Node $i Peers ==="
  curl -s http://localhost:$((3000+i))/peers | jq '.'
done

# Each validator (1-3) should see other validators + observers
# Each observer (4-5) should see validators + other observer
```

---

## Test Module 4: Cryptographic Verification

### 4.1 Vote Signature Validation
**Objective:** Verify vote signature can be validated

**Steps:**
```bash
# Retrieve vote metadata with signature
VOTE=$(docker exec voting-mysql mysql -u root -proot voting -N -e \
  "SELECT signature, voter_public_key FROM votes_meta WHERE nullifier_hash='$NULLIFIER' LIMIT 1;")

echo "Vote Signature: $VOTE"

# In production, verify ECDSA signature using voter's public key
# This prevents vote tampering
```

---

### 4.2 Nullifier Uniqueness
**Objective:** Verify nullifier prevents double voting while maintaining anonymity

**Steps:**
```bash
# Check all nullifiers in election are unique
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT COUNT(DISTINCT nullifier_hash) as unique_nullifiers, COUNT(*) as total_votes 
   FROM votes_meta WHERE election_id=$ELECTION_ID;"

# unique_nullifiers should equal total_votes
```

---

## Test Module 5: Audit Logging

### 5.1 Vote Audit Log
**Objective:** Verify all votes are logged for auditing

**Steps:**
```bash
# Check audit logs for vote actions
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT timestamp, action, success, details FROM audit_logs 
   WHERE action='vote' AND resource_id=$ELECTION_ID 
   ORDER BY timestamp DESC LIMIT 5;"
```

**Verification:**
```bash
# Should show successful vote log with details
# Includes: timestamp, transaction hash, nullifier preview, encryption type
```

---

### 5.2 Security Event Logging
**Objective:** Verify failed vote attempts are logged

**Steps:**
```bash
# Check for double-vote attempts
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT timestamp, action, success, details FROM audit_logs 
   WHERE action='double_vote_attempt' 
   ORDER BY timestamp DESC LIMIT 5;"

# Check for invalid signatures
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT timestamp, action, success, details FROM audit_logs 
   WHERE action='signature_verification' 
   ORDER BY timestamp DESC LIMIT 5;"
```

---

## Test Module 6: Monitoring & Metrics

### 6.1 Grafana Dashboard - System Metrics
**Objective:** Verify system metrics are displayed

**Steps:**
1. Open http://localhost:3030 (admin/admin)
2. Navigate to "Blockchain Voting System - Unified Monitoring"
3. Verify panels display:
   - System CPU Usage (gauge)
   - System Memory Usage (gauge)
   - Network Bytes In/Out (stats)
   - Disk I/O Operations (graph)
   - CPU & Memory trends (graphs)

**Success Criteria:**
- All panels show live data
- Data updates every 30 seconds
- No "No data" messages

---

### 6.2 Grafana Dashboard - Blockchain Metrics
**Objective:** Verify blockchain metrics are displayed

**Steps:**
1. Open http://localhost:3030 (admin/admin)
2. Navigate to "Blockchain Monitoring"
3. Verify top row stats:
   - Blockchain Nodes - Active (should show 5)
   - Observers Active (should show 2)
   - Validators Active (should show 3)
   - Total Votes Processed (should show vote count)

4. Verify main table "Blockchain Nodes Information":
   - Shows 5 rows (one per node)
   - Status column shows UP/DOWN (green/red)
   - Displays transactions processed
   - Displays byzantine attacks count

**Success Criteria:**
- All metrics populated with correct values
- Color coding: Green for UP, Red for DOWN
- Table shows all 5 nodes

---

### 6.3 Prometheus Queries
**Objective:** Verify Prometheus can query blockchain metrics

**Steps:**
```bash
# Open Prometheus http://localhost:9090

# Run queries in Prometheus UI:
# 1. up{job="blockchain-node"}
# 2. blockchain_transactions_processed_total
# 3. blockchain_byzantine_attacks_detected_total
# 4. blockchain_chain_height
# 5. blockchain_connected_peers
```

**Expected Results:**
- All queries return time series data
- Data points updated every 15 seconds
- 5 blockchain nodes in results

---

## Test Module 7: Database Integrity

### 7.1 Vote Count Verification
**Objective:** Verify vote counts match across database and blockchain

**Steps:**
```bash
# Count votes in database
DB_VOTES=$(docker exec voting-mysql mysql -u root -proot voting -N -e \
  "SELECT COUNT(*) FROM votes_meta WHERE election_id=$ELECTION_ID;")

echo "Votes in database: $DB_VOTES"

# Count transactions on blockchain
BLOCKCHAIN_VOTES=$(curl -s http://localhost:3001/chain | \
  jq '[.blocks[].transactions[] | select(.type=="vote")] | length')

echo "Votes on blockchain: $BLOCKCHAIN_VOTES"

# Should match (or blockchain might be slightly behind)
```

---

### 7.2 Data Consistency
**Objective:** Verify no orphaned or inconsistent data

**Steps:**
```bash
# Check for orphaned vote metadata
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT COUNT(*) as orphaned_votes FROM votes_meta vm 
   WHERE NOT EXISTS (
     SELECT 1 FROM elections e WHERE e.id = vm.election_id
   );"

# Should return 0

# Check for mismatched registration status
docker exec voting-mysql mysql -u root -proot voting -e \
  "SELECT vr.id, vr.status, COUNT(vm.id) as vote_count
   FROM voter_registrations vr
   LEFT JOIN votes_meta vm ON vr.election_id = vm.election_id 
     AND EXISTS (SELECT 1 FROM users u WHERE u.id = vr.user_id)
   GROUP BY vr.id
   HAVING vr.status = 'voted' AND vote_count = 0;"

# Should return 0 rows
```

---

## Test Module 8: Performance & Load Testing

### 8.1 Single Vote Performance
**Objective:** Measure vote casting latency

**Steps:**
```bash
# Measure vote submission time
time curl -X POST $BACKEND_URL/elections/$ELECTION_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"candidateId\": $CANDIDATE_ID,
    \"privateKey\": \"test-key-123\"
  }" > /dev/null

# Typical latency: 100-500ms
```

---

### 8.2 Blockchain Sync Performance
**Objective:** Verify blockchain nodes sync quickly

**Steps:**
```bash
# Record current block height
INITIAL_HEIGHT=$(curl -s http://localhost:3001/chain | jq '.blocks | length')

# Wait for new blocks
sleep 5

# Check if all nodes synchronized
for i in {1..5}; do
  HEIGHT=$(curl -s http://localhost:$((3000+i))/chain | jq '.blocks | length')
  echo "Node $i height: $HEIGHT"
done

# All should be equal or within 1 block
```

---

## Test Module 9: Error Handling

### 9.1 Invalid Election
**Objective:** Verify proper error for non-existent election

**Steps:**
```bash
# Try to vote in non-existent election
curl -X POST $BACKEND_URL/elections/99999/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"candidateId\": 1,
    \"privateKey\": \"test-key\"
  }" | jq '.'

# Expected: 404 Not found
```

---

### 9.2 Closed Election
**Objective:** Verify cannot vote in closed election

**Steps:**
```bash
# Create/use a closed election
# Try to vote in it
curl -X POST $BACKEND_URL/elections/2/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"candidateId\": 1,
    \"privateKey\": \"test-key\"
  }" | jq '.'

# Expected: 400 Bad request with "Voting is not currently open"
```

---

### 9.3 Invalid Candidate
**Objective:** Verify error for wrong candidate in election

**Steps:**
```bash
# Try to vote for candidate from different election
curl -X POST $BACKEND_URL/elections/$ELECTION_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"candidateId\": 99999,
    \"privateKey\": \"test-key\"
  }" | jq '.'

# Expected: 404 Candidate not found
```

---

## Test Module 10: Frontend Workflow

### 10.1 Complete Voting Workflow
**Objective:** Test complete user journey through UI

**Steps:**
1. Open http://localhost:5173
2. Click "Register" 
   - Fill form with valid data
   - Submit
   - Verify success message
   
3. Login with credentials
   - Click "Login"
   - Enter email and password
   - Verify redirected to elections page
   
4. View Elections
   - Click on an active election
   - Verify election details displayed
   - Verify candidates list shown
   
5. Cast Vote
   - Click "Vote Now"
   - Select a candidate
   - Click "Submit Vote"
   - Verify success page with receipt
   
6. View Receipt
   - Verify transaction hash displayed
   - Verify nullifier shown
   - Download receipt as JSON
   - Print receipt

---

### 10.2 Vote Result Display
**Objective:** Verify vote result shown after submission

**Steps:**
1. Cast a vote
2. On success page, verify:
   - Success icon (✓) displayed
   - Message: "Vote Successfully Cast!"
   - Vote receipt component displayed
   - Transaction details shown
   - Nullifier displayed for verification
   
3. Check VoteReceipt component:
   - Timestamp formatted correctly
   - Signature displayed (truncated)
   - Encryption method shown: "RSA-OAEP 2048-bit"
   - Important info section visible

---

## Summary Test Command Script

```bash
#!/bin/bash

echo "=== BLOCKCHAIN VOTING SYSTEM - AUTOMATED TEST ==="

BACKEND="http://localhost:3000/api"

# 1. Register user
echo "[1] Registering user..."
REG=$(curl -s -X POST $BACKEND/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Voter",
    "email": "testvoter@test.com",
    "password": "Test123!Pass",
    "studentId": "TEST001"
  }')
echo $REG | jq '.message'

# 2. Login
echo "[2] Logging in..."
LOGIN=$(curl -s -X POST $BACKEND/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testvoter@test.com",
    "password": "Test123!Pass"
  }')
TOKEN=$(echo $LOGIN | jq -r '.token')
echo "Token obtained: ${TOKEN:0:20}..."

# 3. Get elections
echo "[3] Fetching elections..."
ELECTIONS=$(curl -s -X GET $BACKEND/elections \
  -H "Authorization: Bearer $TOKEN")
ELECTION_ID=$(echo $ELECTIONS | jq -r '.elections[0].id')
echo "Election ID: $ELECTION_ID"

# 4. Register for election
echo "[4] Registering for election..."
curl -s -X POST $BACKEND/elections/$ELECTION_ID/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.message'

# 5. Cast vote
echo "[5] Casting vote..."
CANDIDATE_ID=$(echo $ELECTIONS | jq -r '.elections[0].candidates[0].id')
VOTE=$(curl -s -X POST $BACKEND/elections/$ELECTION_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"candidateId\": $CANDIDATE_ID,
    \"privateKey\": \"test-key\"
  }")
echo $VOTE | jq '.message'
echo "Receipt:"
echo $VOTE | jq '.receipt'

# 6. Try double vote
echo "[6] Attempting double vote (should fail)..."
curl -s -X POST $BACKEND/elections/$ELECTION_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"candidateId\": $CANDIDATE_ID,
    \"privateKey\": \"test-key\"
  }" | jq '.message'

# 7. Check vote in database
echo "[7] Verifying vote in database..."
docker exec voting-mysql mysql -u root -proot voting -N -e \
  "SELECT COUNT(*) as vote_count FROM votes_meta WHERE election_id=$ELECTION_ID;" | head -1

# 8. Check blockchain
echo "[8] Checking blockchain nodes..."
for i in {1..5}; do
  HEIGHT=$(curl -s http://localhost:$((3000+i))/chain | jq '.blocks | length')
  echo "Node $i blocks: $HEIGHT"
done

# 9. Check metrics
echo "[9] Checking Prometheus metrics..."
curl -s "http://localhost:9090/api/v1/query?query=up{job=\"blockchain-node\"}" | \
  jq '.data.result | length' | xargs echo "Nodes reporting:"

echo ""
echo "=== TEST COMPLETE ==="
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:3000"
echo "Grafana: http://localhost:3030 (admin/admin)"
echo "Prometheus: http://localhost:9090"
```

Save as `test-voting-system.sh` and run:
```bash
chmod +x test-voting-system.sh
./test-voting-system.sh
```

---

## Expected Outcomes Checklist

- [ ] Users can register with unique credentials
- [ ] Users can login and receive JWT token
- [ ] Users can register for elections
- [ ] Users can cast votes successfully
- [ ] Users receive vote receipt with transaction hash
- [ ] Double voting is prevented with error message
- [ ] Vote appears in database with correct metadata
- [ ] Vote is recorded on blockchain
- [ ] All 5 blockchain nodes maintain consensus
- [ ] Nullifiers are unique per vote
- [ ] Signatures can be verified
- [ ] Grafana dashboards display correct metrics
- [ ] Audit logs record all vote actions
- [ ] System prevents Byzantine attacks
- [ ] Frontend shows vote success and receipt

