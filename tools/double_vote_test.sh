#!/usr/bin/env bash
set -euo pipefail

# Double-vote prevention test script
# Requirements: curl, jq, openssl, docker
# Usage: ./tools/double_vote_test.sh

INSTITUTION_ID="TEST2025001"
PASSWORD="TestPass123!"
ELECTION_ID=1
API_BASE="http://localhost:3000"
BACKEND_CONTAINER="voting-backend"

echo "1) Logging in as $INSTITUTION_ID..."
TOKEN=$(curl -s -X POST "$API_BASE/api/users/login" \
  -H 'Content-Type: application/json' \
  -d "{\"institutionId\":\"$INSTITUTION_ID\",\"password\":\"$PASSWORD\"}" | jq -r '.token')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "\nERROR: Login failed or token not returned. Check credentials and that backend is running."
  exit 1
fi

echo "Token obtained (truncated): ${TOKEN:0:20}..."

# Prepare a valid-looking payload that satisfies validation rules
PUB=$(openssl rand -base64 48)
NULL=$(echo -n "${INSTITUTION_ID}-${ELECTION_ID}-duplicate-test" | sha256sum | awk '{print $1}')
ENCB=$(openssl rand -base64 20)
SIG=$(printf 'b'; for i in {1..127}; do printf 'b'; done)
TS=$(date +%s)

BODY=$(jq -n --arg enc "$ENCB" --arg null "$NULL" --arg sig "$SIG" --arg pub "$PUB" --arg ts "$TS" '{encryptedBallot:$enc, nullifier:$null, signature:$sig, publicKey:$pub, timestamp:$ts}')

echo "\n2) Attempting to cast a second vote for election $ELECTION_ID (should be rejected)..."
HTTP_OUTPUT=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/elections/$ELECTION_ID/vote" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$BODY")

HTTP_BODY=$(echo "$HTTP_OUTPUT" | sed '$d')
HTTP_CODE=$(echo "$HTTP_OUTPUT" | tail -n1)

echo "\nResponse code: $HTTP_CODE"
echo "Response body:\n$HTTP_BODY"

# Run backend helpers (non-fatal if they fail)
echo "\n3) Running backend vote check (check-vote.js) inside $BACKEND_CONTAINER..."
if docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  docker exec -it $BACKEND_CONTAINER node check-vote.js || true
else
  echo "Backend container '$BACKEND_CONTAINER' not running (or docker not available). Skipping check-vote.js"
fi

# Query recent audit logs for this user via a node one-liner inside the backend container
echo "\n4) Querying recent audit log entries for $INSTITUTION_ID (inside $BACKEND_CONTAINER)..."
if docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  docker exec -i $BACKEND_CONTAINER node - <<'NODE'
const { pool } = require('./config/db');
(async () => {
  try {
    const [rows] = await pool.query(
      "SELECT id, event_type, details, timestamp FROM audit_logs WHERE user_id = (SELECT id FROM users WHERE institution_id = ?) ORDER BY timestamp DESC LIMIT 10",
      [process.env.INSTITUTION_ID || 'TEST2025001']
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Error querying audit_logs:', e.message);
  } finally {
    process.exit(0);
  }
})();
NODE
else
  echo "Backend container not running. Skipping audit log query."
fi

echo "\nDouble-vote test script completed."
