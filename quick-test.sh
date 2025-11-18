#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BLOCKCHAIN VOTING SYSTEM - QUICK TEST ===${NC}\n"

BACKEND="http://localhost:3000/api"
TIMESTAMP=$(date +%s)
EMAIL="voter$TIMESTAMP@test.com"

# 1. Health Check
echo -e "${BLUE}[1] Checking system health...${NC}"
HEALTH=$(curl -s http://localhost:3000/health)
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Backend is healthy${NC}"
else
  echo -e "${RED}✗ Backend not responding${NC}"
  exit 1
fi

# 2. Register User
echo -e "\n${BLUE}[2] Registering new user...${NC}"
REG=$(curl -s -X POST $BACKEND/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Voter $TIMESTAMP\",
    \"email\": \"$EMAIL\",
    \"password\": \"TestPass123!\",
    \"studentId\": \"STU$TIMESTAMP\"
  }")

if echo $REG | jq -e '.userId' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ User registered successfully${NC}"
  echo "  Email: $EMAIL"
else
  echo -e "${RED}✗ Registration failed${NC}"
  echo $REG | jq '.message'
  exit 1
fi

# 3. Login
echo -e "\n${BLUE}[3] Logging in...${NC}"
LOGIN=$(curl -s -X POST $BACKEND/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"TestPass123!\"
  }")

TOKEN=$(echo $LOGIN | jq -r '.token')
if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "  Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi

# 4. Get Elections
echo -e "\n${BLUE}[4] Fetching elections...${NC}"
ELECTIONS=$(curl -s -X GET $BACKEND/elections \
  -H "Authorization: Bearer $TOKEN")

ELECTION_ID=$(echo $ELECTIONS | jq -r '.elections[0].id')
ELECTION_TITLE=$(echo $ELECTIONS | jq -r '.elections[0].title')
ELECTION_STATUS=$(echo $ELECTIONS | jq -r '.elections[0].status')

if [ ! -z "$ELECTION_ID" ] && [ "$ELECTION_ID" != "null" ]; then
  echo -e "${GREEN}✓ Elections retrieved${NC}"
  echo "  Election: $ELECTION_TITLE"
  echo "  Status: $ELECTION_STATUS"
  echo "  ID: $ELECTION_ID"
else
  echo -e "${RED}✗ No elections found${NC}"
  exit 1
fi

# Check if election is active
if [ "$ELECTION_STATUS" != "active" ]; then
  echo -e "${RED}✗ Election is not active (status: $ELECTION_STATUS)${NC}"
  exit 1
fi

# 5. Register for Election
echo -e "\n${BLUE}[5] Registering for election...${NC}"
REG_ELECTION=$(curl -s -X POST $BACKEND/elections/$ELECTION_ID/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

if echo $REG_ELECTION | jq -e '.registrationToken' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Registered for election${NC}"
else
  echo -e "${RED}✗ Election registration failed${NC}"
  echo $REG_ELECTION | jq '.message'
  exit 1
fi

# 6. Get Candidates
echo -e "\n${BLUE}[6] Getting candidates...${NC}"
ELECTION_DETAILS=$(curl -s -X GET $BACKEND/elections/$ELECTION_ID \
  -H "Authorization: Bearer $TOKEN")

CANDIDATE_ID=$(echo $ELECTION_DETAILS | jq -r '.candidates[0].id')
CANDIDATE_NAME=$(echo $ELECTION_DETAILS | jq -r '.candidates[0].name')

if [ ! -z "$CANDIDATE_ID" ] && [ "$CANDIDATE_ID" != "null" ]; then
  echo -e "${GREEN}✓ Candidates retrieved${NC}"
  echo "  Selected: $CANDIDATE_NAME (ID: $CANDIDATE_ID)"
else
  echo -e "${RED}✗ No candidates found${NC}"
  exit 1
fi

# 7. Cast Vote
echo -e "\n${BLUE}[7] Casting vote...${NC}"
VOTE=$(curl -s -X POST $BACKEND/elections/$ELECTION_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"candidateId\": $CANDIDATE_ID,
    \"privateKey\": \"test-key-123\"
  }")

TX_HASH=$(echo $VOTE | jq -r '.receipt.transactionHash')
NULLIFIER=$(echo $VOTE | jq -r '.receipt.nullifier')

if [ ! -z "$TX_HASH" ] && [ "$TX_HASH" != "null" ]; then
  echo -e "${GREEN}✓ Vote cast successfully${NC}"
  echo "  Transaction Hash: ${TX_HASH:0:16}..."
  echo "  Nullifier: ${NULLIFIER:0:16}..."
else
  echo -e "${RED}✗ Vote submission failed${NC}"
  echo $VOTE | jq '.message'
  exit 1
fi

# 8. Verify Double Vote Prevention
echo -e "\n${BLUE}[8] Testing double vote prevention...${NC}"
DOUBLE_VOTE=$(curl -s -X POST $BACKEND/elections/$ELECTION_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"candidateId\": $CANDIDATE_ID,
    \"privateKey\": \"test-key-123\"
  }")

ERROR_MSG=$(echo $DOUBLE_VOTE | jq -r '.message')
if echo "$ERROR_MSG" | grep -q "already voted"; then
  echo -e "${GREEN}✓ Double vote prevented${NC}"
  echo "  Error: $ERROR_MSG"
else
  echo -e "${RED}✗ Double vote not prevented${NC}"
  exit 1
fi

# 9. Check Database
echo -e "\n${BLUE}[9] Verifying vote in database...${NC}"
VOTE_COUNT=$(docker exec voting-mysql mysql -u root -proot voting -N -e \
  "SELECT COUNT(*) FROM votes_meta WHERE election_id=$ELECTION_ID;" 2>/dev/null)

if [ ! -z "$VOTE_COUNT" ] && [ "$VOTE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Vote recorded in database${NC}"
  echo "  Total votes: $VOTE_COUNT"
else
  echo -e "${YELLOW}⚠ Could not verify database (MySQL might not be accessible)${NC}"
fi

# 10. Check Blockchain Consensus
echo -e "\n${BLUE}[10] Checking blockchain consensus...${NC}"
NODES_READY=0
for i in {1..5}; do
  HEIGHT=$(curl -s http://localhost:$((3000+i))/chain 2>/dev/null | jq '.blocks | length' 2>/dev/null)
  if [ ! -z "$HEIGHT" ] && [ "$HEIGHT" -gt 0 ]; then
    NODES_READY=$((NODES_READY + 1))
    echo "  Node $i: $HEIGHT blocks"
  fi
done

if [ $NODES_READY -ge 3 ]; then
  echo -e "${GREEN}✓ Blockchain nodes are active${NC}"
else
  echo -e "${YELLOW}⚠ Only $NODES_READY nodes responding${NC}"
fi

# 11. Check Metrics
echo -e "\n${BLUE}[11] Checking monitoring metrics...${NC}"
METRICS=$(curl -s "http://localhost:9090/api/v1/query?query=up{job=\"blockchain-node\"}" 2>/dev/null | jq '.data.result | length' 2>/dev/null)

if [ ! -z "$METRICS" ]; then
  echo -e "${GREEN}✓ Prometheus metrics available${NC}"
  echo "  Nodes reporting: $METRICS"
else
  echo -e "${YELLOW}⚠ Could not reach Prometheus${NC}"
fi

# Final Summary
echo -e "\n${BLUE}=== TEST SUMMARY ===${NC}"
echo -e "${GREEN}✓ All critical tests passed!${NC}\n"

echo "Key Information:"
echo "  Email: $EMAIL"
echo "  Election: $ELECTION_TITLE"
echo "  Vote: $CANDIDATE_NAME"
echo "  Transaction Hash: $TX_HASH"
echo ""
echo "Access URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend: http://localhost:3000"
echo "  Grafana: http://localhost:3030 (admin/admin)"
echo "  Prometheus: http://localhost:9090"
echo ""
echo -e "${BLUE}You can now test the frontend at: http://localhost:5173${NC}"
echo "Login with: $EMAIL / TestPass123!"
