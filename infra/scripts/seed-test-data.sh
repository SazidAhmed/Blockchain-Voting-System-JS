#!/bin/bash
# Comprehensive test data seed for test Docker stack.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../tests/test-config.sh"
source "$SCRIPT_DIR/seed-test-expected-values.sh"

# Override port if stack is running on 3000 (standard dev) vs 3005 (test)
if [ "$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/health" 2>/dev/null)" = "200" ]; then
  BACKEND_URL="http://localhost:3000/api"
  BACKEND_HOST="http://localhost:3000"
fi

echo -e "${BLUE}=== Test Data Seeder (Comprehensive) ===${NC}\n"

# Check backend
BACKEND_HEALTH_URL="${BACKEND_URL:-http://localhost:3000}/health"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_HEALTH_URL" 2>/dev/null || echo "000")
if [ "$HEALTH" != "200" ]; then 
  # Try fallback to test config host if env one failed
  HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_HOST/health" 2>/dev/null || echo "000")
  if [ "$HEALTH" != "200" ]; then echo -e "${RED}Backend unreachable at $BACKEND_HEALTH_URL or $BACKEND_HOST${NC}"; exit 1; fi
fi

# 1. Login as admin
echo -e "${BLUE}→ Login as admin${NC}"
ADMIN_COOKIE=$(mktemp)
trap 'rm -f "$ADMIN_COOKIE"' EXIT
ADMIN_LOGIN=$(curl -s -c "$ADMIN_COOKIE" -X POST "$BACKEND_URL/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\",\"loginType\":\"admin\"}")
if [ -z "$(echo "$ADMIN_LOGIN" | "$JQ_CMD" -r '.user.id // empty' 2>/dev/null)" ]; then
  echo -e "${RED}Admin login failed. Run seed.js first.${NC}"
  echo "  docker compose -f infra/docker/docker-compose.test.yml exec backend node scripts/seed.js"
  exit 1
fi
echo -e "${GREEN}✓ Admin authenticated${NC}"
CSRF=$(awk '$6 == "csrf-token" {print $7}' "$ADMIN_COOKIE" | tail -1)

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
    -b "$ADMIN_COOKIE" \
    -H "Content-Type: application/json" \
    -H "x-csrf-token: $CSRF" \
    -d "{\"title\":\"$title\",\"description\":\"$desc\",\"startDate\":\"$start\",\"endDate\":\"$end\",\"candidates\":$CANDIDATES_JSON}")
  EID=$(echo "$RESP" | "$JQ_CMD" -r '.id // .electionId // empty' 2>/dev/null)
  if [ -n "$EID" ]; then
    echo -e "${GREEN}✓ $title (ID: $EID)${NC}"
    # Activate if needed
    if [ "$status" = "active" ]; then
      curl -s -X PATCH "$BACKEND_URL/elections/$EID/status" \
        -b "$ADMIN_COOKIE" \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $CSRF" \
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

# Detect running backend container name
BACKEND_CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | head -1)
MYSQL_CONTAINER=$(docker ps --filter "name=mysql" --format "{{.Names}}" | head -1)

# Read database details from main .env since we're targeting the active dev stack
DB_PASS_SEED="voting_root_pass"
DB_NAME_SEED="voting_db"
if [ -f "$SCRIPT_DIR/../../.env" ]; then
  # Extract values if present
  ENV_DB_ROOT_PASS=$(grep -E "^(MYSQL_ROOT_PASSWORD|DB_ROOT_PASSWORD)=" "$SCRIPT_DIR/../../.env" | cut -d'=' -f2- | head -1)
  ENV_DB_NAME=$(grep -E "^(MYSQL_DATABASE|DB_NAME)=" "$SCRIPT_DIR/../../.env" | cut -d'=' -f2- | head -1)
  [ -n "$ENV_DB_ROOT_PASS" ] && DB_PASS_SEED="$ENV_DB_ROOT_PASS"
  [ -n "$ENV_DB_NAME" ] && DB_NAME_SEED="$ENV_DB_NAME"
fi

VOTER_HASH=$(docker exec "$BACKEND_CONTAINER" node -e "console.log(require('bcryptjs').hashSync('$SEED_VOTER_PASS', 10))" 2>/dev/null || echo "")

if [ -n "$VOTER_HASH" ] && [ -n "$MYSQL_CONTAINER" ]; then
  # Create multiple voters from institution seed data
  echo "  Inserting into database: $DB_NAME_SEED"
  docker exec "$MYSQL_CONTAINER" mysql -u root -p"$DB_PASS_SEED" "$DB_NAME_SEED" \
    -N -e "INSERT IGNORE INTO users (institution_id, username, password, role, email, public_key, pseudonym_id, registration_status) VALUES
      ('STU00001','Student One','$VOTER_HASH','student','voter1@university.edu','test-key-1',SHA2('STU00001',256),'verified'),
      ('STU00002','Student Two','$VOTER_HASH','student','voter2@university.edu','test-key-2',SHA2('STU00002',256),'verified'),
      ('STU00003','Student Three','$VOTER_HASH','student','voter3@university.edu','test-key-3',SHA2('STU00003',256),'verified'),
      ('STU00004','Student Four','$VOTER_HASH','student','voter4@university.edu','test-key-4',SHA2('STU00004',256),'verified'),
      ('STU00005','Student Five','$VOTER_HASH','student','voter5@university.edu','test-key-5',SHA2('STU00005',256),'verified');"
  echo -e "${GREEN}✓ Student users seeded (STU00001-STU00005) with pass: $SEED_VOTER_PASS${NC}"
else
  echo -e "${YELLOW}⚠ Could not generate password hash or find containers (Backend: $BACKEND_CONTAINER, MySQL: $MYSQL_CONTAINER)${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Seed complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Admin:  $SEED_ADMIN_ID / $SEED_ADMIN_PASS"
echo "Voter:  STU00001 / $SEED_VOTER_PASS"
echo "Active election ID: ${ACTIVE_EID:-check manually}"
