#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../test-config.sh"

ADMIN_COOKIE=$(mktemp)
VOTER_COOKIE=$(mktemp)
trap 'rm -f "$ADMIN_COOKIE" "$VOTER_COOKIE"' EXIT

echo -e "${BLUE}=== SECURITY SUITE ===${NC}"
echo ""

# Get cookies FIRST (before rate limiting)
ADMIN_LOGIN=$(curl -s -c "$ADMIN_COOKIE" -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"$SEED_ADMIN_ID\",\"password\":\"$SEED_ADMIN_PASS\",\"loginType\":\"admin\"}")

EID=$(curl -s -b "$ADMIN_COOKIE" -X GET "$BACKEND_URL/elections" | \
  "$JQ_CMD" -r '.[] | select(.status=="active") | .id' | head -1)
DETAILS=$(curl -s -b "$ADMIN_COOKIE" -X GET "$BACKEND_URL/elections/$EID")
CID=$(echo "$DETAILS" | "$JQ_CMD" -r '.candidates[0].id')
PUBKEY=$(echo "$DETAILS" | "$JQ_CMD" -r '.public_key // empty')

VOTER_LOGIN=$(curl -s -c "$VOTER_COOKIE" -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d "{\"institutionId\":\"TEACH0001\",\"password\":\"$SEED_VOTER_PASS\",\"loginType\":\"voter\"}")

ADMIN_CSRF=$(csrf_token "$ADMIN_COOKIE")
VOTER_CSRF=$(csrf_token "$VOTER_COOKIE")

# S1: Unauthenticated vote
echo -e "\n${BLUE}[S1] Unauthenticated vote${NC}"
S1=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/elections/$EID/vote" \
  -H "Content-Type: application/json" -d "{\"encryptedBallot\":\"AAAAAAAAAAAAAAAAAA\",\"nullifier\":\"$(printf '0%.0s' $(seq 1 64))\",\"signature\":\"AA\",\"publicKey\":\"AA\"}")
check "s1" "No-auth vote: HTTP $S1" [ "$S1" = "401" -o "$S1" = "403" ]

# S2: Wrong role vote (admin tries to vote)
echo -e "\n${BLUE}[S2] Admin vote attempt${NC}"
PKG_ADMIN=$(node "$VOTE_PACKAGE_HELPER" "$EID" "$CID" "$PUBKEY")
S2=$(curl -s -b "$ADMIN_COOKIE" -X POST "$BACKEND_URL/elections/$EID/vote" -H "Content-Type: application/json" -H "x-csrf-token: $ADMIN_CSRF" -d "$PKG_ADMIN")
S2_MSG=$(echo "$S2" | "$JQ_CMD" -r '.message // ""')
check "s2" "Admin vote: ${S2_MSG:0:40}" [ -n "$S2_MSG" ]

# S3: XSS in login
echo -e "\n${BLUE}[S3] XSS attempt${NC}"
S3=$(curl -s -X POST "$BACKEND_URL/users/login" -H "Content-Type: application/json" \
  -d '{"institutionId":"<script>alert(1)</script>","password":"x"}')
S3_USER=$(echo "$S3" | "$JQ_CMD" -r '.user.id // ""')
check "s3" "XSS reflected" [ -z "$S3_USER" ]

# S5: Nullifier uniqueness (BEFORE rate limit test)
echo -e "\n${BLUE}[S5] Nullifier uniqueness${NC}"
PKG=$(node "$VOTE_PACKAGE_HELPER" "$EID" "$CID" "$PUBKEY")
S5=$(curl -s -b "$VOTER_COOKIE" -X POST "$BACKEND_URL/elections/$EID/vote" -H "Content-Type: application/json" -H "x-csrf-token: $VOTER_CSRF" -d "$PKG")
S5_TX=$(echo "$S5" | "$JQ_CMD" -r '.receipt.transactionHash // .transactionHash // empty')
S5_MSG=$(echo "$S5" | "$JQ_CMD" -r '.message // ""' | tr '[:upper:]' '[:lower:]')
case "$S5_MSG" in *already*|*duplicate*|*voted*) S5_PASS=0;; *) S5_PASS=1;; esac
check "s5" "Vote accepted: ${S5_TX:0:20}..." [ "$S5_PASS" = "1" ]
DV=$(curl -s -b "$VOTER_COOKIE" -X POST "$BACKEND_URL/elections/$EID/vote" -H "Content-Type: application/json" -H "x-csrf-token: $VOTER_CSRF" -d "$PKG")
DV_MSG=$(echo "$DV" | "$JQ_CMD" -r '.message // ""' | tr '[:upper:]' '[:lower:]')
case "$DV_MSG" in *already*|*duplicate*|*voted*) DV_PASS=1;; *) DV_PASS=0;; esac
check "s5b" "Nullifier reuse blocked: ${DV_MSG:0:40}" [ "$DV_PASS" = "1" ]

# S4: Mass registration (LAST — poisons IP)
echo -e "\n${BLUE}[S4] Rate limiting${NC}"
R429=0
for i in $(seq 1 20); do
  RC=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/users/login" \
    -H "Content-Type: application/json" -d "{\"institutionId\":\"FAKE$i\",\"password\":\"x\"}")
  [ "$RC" = "429" ] && { R429=1; break; }
done
check "s4" "Rate limit activates" [ "$R429" = "1" ]

summary
