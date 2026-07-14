# AGENTS.md — University Blockchain Voting System

## Architecture

5 Docker services, no root package.json:

| Service         | Port      | Stack                | Entry                                    |
| --------------- | --------- | -------------------- | ---------------------------------------- |
| frontend        | 5173      | Vue 3 + Vite + Vuex  | `services/frontend/`                     |
| admin-panel     | 5174      | Vue 3 + Vite + Pinia | `services/admin-panel/`                  |
| backend         | 3000      | Express 5 + MySQL    | `services/backend/index.js`              |
| blockchain-node | 3001-3004 | Express + LevelDB    | `services/blockchain-node/index.js`      |
| institution-api | 4000      | Express 4 + MySQL    | `services/institution-api/src/server.js` |

4 blockchain nodes run for peer consensus. Backend depends on MySQL, blockchain-node, and institution-api.

## Quick Start

```bash
cp .env.example .env
docker-compose -f infra/docker/docker-compose.yml up --build -d
```

Services wait for healthchecks before starting. Backend runs migrations automatically on boot.

## Commands

```bash
# Full stack
docker-compose -f infra/docker/docker-compose.yml up --build -d
docker-compose -f infra/docker/docker-compose.yml down -v

# Backend only (local dev)
cd services/backend && npm install && npm run migrate && npm run dev

# Frontend only
cd services/frontend && npm install && npm run dev

# Health check
bash infra/scripts/docker-health-check.sh

# Seed test data
bash infra/scripts/docker-seed.sh

# Run integration tests (requires running stack)
bash tests/quick-test.sh
```

## Testing

No unit test framework configured — `npm test` is a stub in all services. Testing is integration-only via curl scripts:

- `tests/quick-test.sh` — full vote flow (register → login → vote → double-vote check)
- `tests/run-comprehensive-tests.sh` — extended scenarios
- `tests/e2e/*.sh` — network partition, mining, tamper detection
- `tests/security/PRACTICAL_SECURITY_TESTS.sh` — security scenarios

All require Docker stack running. Run `docker-compose up -d` first.

## Database

- MySQL 8.0 with `voting_db`
- Schema in `services/backend/migrations/*.sql` (auto-run on Docker init + backend boot)
- Seeding: `bash infra/scripts/docker-seed.sh`
- Access: phpMyAdmin at `localhost:8080`

## Key Conventions

- **Crypto**: ECDSA P-256 signatures (client-side via Web Crypto API), RSA-OAEP 2048-bit ballot encryption
- **Nullifiers**: SHA-256 hash for double-vote prevention — never reuse nullifiers
- **Transaction hashes**: Deterministic SHA-256 of `{electionId, nullifier, encryptedBallot, timestamp}`
- **Blockchain**: Custom PoW with LevelDB persistence, Merkle tree vote verification
- **Auth**: JWT with ECDSA verification, rate-limited endpoints

## File Layout

```text
services/
  backend/         # API routes in routes/, models in models/, utils/crypto.js
  blockchain-node/ # Core in src/core/, network in src/network/, monitoring in src/monitoring/
  frontend/        # Views in src/views/, crypto services in src/services/crypto.js
  admin-panel/     # Separate Vue app, shares backend API
  institution-api/ # Mock directory API for voter registration
infra/
  docker/          # docker-compose files (main, monitoring, multi-node, prod)
  scripts/         # Helper scripts (backup, restore, health, seed, logs)
  monitoring/      # Prometheus, Grafana dashboards, Loki config
tests/
  e2e/             # Shell-based integration tests
  security/        # Security test scenarios
```

## Gotchas

- Backend `CORS` allows `localhost:5173` and `localhost:5174` only — add new frontend ports to `services/backend/index.js`
- Frontend uses `VITE_API_BASE_URL`, `VITE_BLOCKCHAIN_URL`, and `VITE_INSTITUTION_API_URL` env vars (set in docker-compose, not `.env`)
- Blockchain node peer discovery uses `PEERS` env var with comma-separated URLs, staggered 2s connections
- `package-lock.json` is gitignored — run `npm install` in each service dir after cloning
- Express 5 is used in backend/blockchain-node (not 4) — middleware API differs
- Institution API uses Express 4 (different from backend)
