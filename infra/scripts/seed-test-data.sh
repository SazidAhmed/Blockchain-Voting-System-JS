#!/bin/bash
# Comprehensive test data seed for test Docker stack.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../tests/test-config.sh"
source "$SCRIPT_DIR/seed-test-expected-values.sh"

echo -e "${BLUE}=== Test Data Seeder (Comprehensive) ===${NC}\n"

# Check backend
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_HOST/health" 2>/dev/null || echo "000")
if [ "$HEALTH" != "200" ]; then echo -e "${RED}Backend unreachable${NC}"; exit 1; fi

# 1. Login as admin
echo -e "${BLUE}→ Login as admin${NC}"
ADMIN_LOGIN=$(curl -s -X POST "$BACKEND_URL/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\"}")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | "$JQ_CMD" -r '.token // empty' 2>/dev/null)
if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}Admin login failed. Run seed.js first.${NC}"
  echo "  docker compose -f infra/docker/docker-compose.test.yml exec backend node scripts/seed.js"
  exit 1
fi
echo -e "${GREEN}✓ Admin token obtained${NC}"

# 2. Create 3 elections (past, active, future) with candidates inline
echo -e "\n${BLUE}→ Creating elections...${NC}"

mkdir -p /tmp/voting-test-seed

for election_info in \
  "Past Election 2024|Historical election|2023-01-01 00:00:00|2024-06-30 23:59:59|past" \
  "Active Election 2025|Currently open election|2025-01-01 00:00:00|2027-12-31 23:59:59|active" \
  "Future Election 2028|Upcoming election|2028-01-01 00:00:00|2028-06-30 23:59:59|future"; do

  IFS='|' read -r title desc start end status <<< "$election_info"
  CANDIDATES_JSON="["
  for i in 1 2 3 4 5; do
    [ "$i" -gt 1 ] && CANDIDATES_JSON+=","
    CANDIDATES_JSON+="{\"name\":\"Candidate ${title:0:1}-$i\",\"description\":\"${title} candidate $i\"}"
  done
  CANDIDATES_JSON+="]"

  RESP=$(curl -s -X POST "$BACKEND_URL/elections" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"$title\",\"description\":\"$desc\",\"startDate\":\"$start\",\"endDate\":\"$end\",\"candidates\":$CANDIDATES_JSON}")
  EID=$(echo "$RESP" | "$JQ_CMD" -r '.id // .electionId // empty' 2>/dev/null)
  if [ -n "$EID" ]; then
    echo -e "${GREEN}✓ $title (ID: $EID)${NC}"
    # Activate if needed
    if [ "$status" = "active" ]; then
      curl -s -X PATCH "$BACKEND_URL/elections/$EID/status" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"status":"active"}' > /dev/null
      echo "  → Activated"
    fi
    echo "$EID" > "/tmp/voting-test-seed/${status}_election_id"
  else
    echo -e "${YELLOW}⚠ $title: $(echo "$RESP" | "$JQ_CMD" -r '.message // "unknown"' 2>/dev/null)${NC}"
  fi
done

ACTIVE_EID=$(cat /tmp/voting-test-seed/active_election_id 2>/dev/null || echo "")

# 3. Create test voter users directly in MySQL (bypass OTP)
echo -e "\n${BLUE}→ Creating test voter users...${NC}"
VOTER_HASH=$(docker exec voting-test-backend node -e "console.log(require('bcryptjs').hashSync('$SEED_VOTER_PASS', 10))" 2>/dev/null || echo "")

if [ -n "$VOTER_HASH" ]; then
  # Create multiple voters from institution seed data
  docker exec voting-test-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" \
    -N -e "INSERT IGNORE INTO users (institution_id, username, password, role, email, public_key, pseudonym_id, registration_status) VALUES
      ('STU00001','Test Voter One','$VOTER_HASH','student','$SEED_VOTER_EMAIL','test-public-key-1',SHA2('STU00001',256),'verified'),
      ('STU00002','Test Voter Two','$VOTER_HASH','student','voter2@university.edu','test-public-key-2',SHA2('STU00002',256),'verified'),
      ('STU00003','Test Voter Three','$VOTER_HASH','student','voter3@university.edu','test-public-key-3',SHA2('STU00003',256),'verified'),
      ('STU00004','Test Voter Four','$VOTER_HASH','student','voter4@university.edu','test-public-key-4',SHA2('STU00004',256),'verified'),
      ('STU00005','Test Voter Five','$VOTER_HASH','student','voter5@university.edu','test-public-key-5',SHA2('STU00005',256),'verified'),
      ('TEACH0001','Test Teacher','$VOTER_HASH','teacher','teacher@university.edu','test-public-key-t',SHA2('TEACH0001',256),'verified');" 2>/dev/null
  echo -e "${GREEN}✓ Voter users created (STU00001-STU00003, TEACH0001)${NC}"
else
  echo -e "${YELLOW}⚠ Could not generate password hash${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Seed complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Admin:  $SEED_ADMIN_ID / $SEED_ADMIN_PASS"
echo "Voter:  STU00001 / $SEED_VOTER_PASS"
echo "Active election ID: ${ACTIVE_EID:-check manually}"
