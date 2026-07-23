#!/bin/bash
# generate-secrets.sh — Auto-generate missing secrets and persist to .env
# Called by docker-start.sh before docker-compose up.
# In production, set secrets via env vars / secrets manager instead.

set -e

ENV_FILE="${1:-.env}"
ENV_EXAMPLE=".env.example"

# ── Helpers ──────────────────────────────────────────────────────────
gen_hex() {
  # $1 = byte length (default 32 → 64 hex chars)
  local len="${1:-32}"
  if command -v openssl &>/dev/null; then
    openssl rand -hex "$len"
  elif command -v node &>/dev/null; then
    node -e "process.stdout.write(require('crypto').randomBytes($len).toString('hex'))"
  else
    # Fallback: /dev/urandom (Linux, Git Bash, WSL)
    head -c "$len" /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c "$((len * 2))"
  fi
}

ensure_secret() {
  local key="$1"
  local desc="$2"
  local len="${3:-32}"

  # Already has a value
  if grep -qE "^${key}=.+" "$ENV_FILE"; then
    return 0
  fi

  local value
  value=$(gen_hex "$len")

  if grep -qE "^${key}=" "$ENV_FILE"; then
    # Replace existing blank entry
    if sed --version >/dev/null 2>&1; then
      # GNU sed (Linux)
      sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
      # BSD sed (macOS)
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    fi
  else
    # Key doesn't exist at all
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi

  echo "  generated $key ($desc)"
}


# ── Main ─────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "Created $ENV_FILE from $ENV_EXAMPLE"
  else
    echo "Error: neither $ENV_FILE nor $ENV_EXAMPLE found" >&2
    exit 1
  fi
fi

echo "Checking secrets in $ENV_FILE ..."

changed=0

# JWT_SECRET — 64 bytes (128 hex chars) for HS256
if ! grep -qE "^JWT_SECRET=.+" "$ENV_FILE" 2>/dev/null; then
  ensure_secret "JWT_SECRET" "JWT signing key (HS256, 128 hex)" 64
  changed=1
fi

# BLOCKCHAIN_API_KEY — 32 bytes (64 hex chars)
if ! grep -qE "^BLOCKCHAIN_API_KEY=.+" "$ENV_FILE" 2>/dev/null; then
  ensure_secret "BLOCKCHAIN_API_KEY" "Blockchain node API key" 32
  changed=1
fi

# INSTITUTION_API_KEY — 32 bytes (64 hex chars)
if ! grep -qE "^INSTITUTION_API_KEY=.+" "$ENV_FILE" 2>/dev/null; then
  ensure_secret "INSTITUTION_API_KEY" "Institution API key" 32
  changed=1
fi

if [ "$changed" -eq 0 ]; then
  echo "  All secrets already present."
else
  echo "  Secrets persisted to $ENV_FILE"
fi
