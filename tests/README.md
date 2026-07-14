# Test Suite — Blockchain Voting System

## Structure

```
tests/
├── run-tests.sh              # Interactive test runner (entry point)
├── test-config.sh            # Centralized config: URLs, ports, credentials, helpers
├── README.md                 # This file
├── categories/               # ACTIVE test scripts (use isolated test Docker)
│   ├── smoke-test.sh         #   Core flow: health, login, vote, double-vote, DB
│   ├── integration-test.sh   #   Full vote lifecycle, blockchain, audit trail
│   ├── attack-test.sh        #   Tampered ballot, replay, SQLi, no-auth, JWT, rate-limit
│   ├── detection-test.sh     #   Node health, chain consistency, Merkle stats
│   ├── security-suite.sh     #   No-auth vote, nullifier uniqueness, XSS, rate-limit
│   └── resilience-test.sh    #   Node restart, post-restart vote, sync, backend restart
├── archive/                  # Superseded tests preserved for reference
│   ├── e2e/                  #   Original phase-by-phase e2e tests (29 files)
│   └── security/             #   Original security test suite (9 files)
├── deprecated/               # Removed tests preserved with code + reasons
│   ├── quick-test.sh
│   └── run-comprehensive-tests.sh
└── results/                  # Test run output (created at runtime)
```

## Quick Start

```bash
# Start test Docker stack + run interactive menu
bash tests/run-tests.sh

# Or run a single category directly (requires test Docker running)
bash tests/categories/smoke-test.sh
```

## How It Works

### Test Docker Stack

Tests run against an **isolated Docker stack** — separate from your dev environment:

| Service | Dev Port | Test Port |
|---------|----------|-----------|
| MySQL | 3306 | 3307 |
| Backend | 3000 | 3005 |
| Blockchain nodes | 3001-3004 | 3010-3013 |
| Frontend | 5173 | 5175 |
| Institution API | 4000 | 4005 |

- `docker-compose.test.yml` in `infra/docker/` uses offset ports
- Separate network (`voting-test-network`) and volumes — no interference
- Backend auto-runs migrations on boot

### Interactive Menu

```
  1) Quick Smoke Test      — health, login, vote, double-vote
  2) Integration Tests     — vote lifecycle, blockchain verification
  3) Security Attacks      — tampered ballot, replay, SQLi, no-auth, JWT
  4) Malicious Detection   — node health, chain consistency, Merkle stats
  5) Resilience Tests      — node restart, sync, backend restart
  6) Full Security Suite   — no-auth vote, nullifier, XSS, rate-limit
  7) Run All               — runs all 6 categories with full reset

  a) Run ALL categories (with full stack reset)
  q) Quit
```

Each category auto-seeds required data before running.

### Test Runner Behavior

- **`bash tests/run-tests.sh`** — Interactive menu (no args)
- **`bash tests/run-tests.sh all`** — Full reset + run all categories
- **`bash tests/run-tests.sh smoke-test`** — Single category (no reset)
- **`bash tests/run-tests.sh --help`** — Show help

Backend restarts between categories to reset rate-limiter state.

## Category Details

### smoke-test.sh
Tests: System health, admin login, elections list, candidates, voter login, vote casting, blockchain verification, double-vote prevention, DB persistence.

### integration-test.sh
Tests: Admin login, active election, candidates, voter login, vote with receipt, blockchain propagation, double-vote rejection, DB persistence.

### attack-test.sh
Tests: Tampered ballot (bad candidateId), replay attack, SQL injection, no-auth admin access, JWT tampering, large payload, invalid election ID, rate limiting.

### detection-test.sh
Tests: Node health/status, chain height consistency, audit trail exposure, Merkle statistics.

### resilience-test.sh
Tests: Blockchain node restart, vote after restart, cross-node sync after restart, backend restart with health check.

### security-suite.sh
Tests: Unauthenticated vote, admin vote attempt, XSS in login, nullifier uniqueness, rate limiting.

## Config

`test-config.sh` sources `.env.test` if present. Default values:

| Variable | Default |
|----------|---------|
| `BACKEND_URL` | `http://localhost:3005/api` |
| `SEED_ADMIN_ID` | `ADMIN001` |
| `SEED_ADMIN_PASS` | `admin123` |
| `SEED_VOTER_EMAIL` | `demo-voter@university.edu` |
| `SEED_VOTER_PASS` | `DemoPass123!` |
| `MYSQL_PORT` | `3307` |
| `BLOCKCHAIN_PORTS` | `3010 3011 3012 3013` |

Override any via environment variables or `.env.test` file.

## Seed Data

| Script | Data | Used By |
|--------|------|---------|
| `infra/scripts/seed-test-data.sh` | Comprehensive — 3 elections, 15 candidates, 6 voters | Security suite, Run All |
| `infra/scripts/seed-test-smoke.sh` | 1 active election, 3 candidates, 1 voter | smoke-test.sh |
| `infra/scripts/seed-test-integration.sh` | 1 active election, 5 candidates, 2 voters | integration-test.sh |
| `infra/scripts/seed-test-attack.sh` | Tampered chain data, malicious voter records | attack-test.sh |
| `infra/scripts/seed-test-detection.sh` | Byzantine configs, suspicious activity logs | detection-test.sh |
| `infra/scripts/seed-test-resilience.sh` | Multi-node state, partition scenario data | resilience-test.sh |

Expected values for assertions defined in `infra/scripts/seed-test-expected-values.sh`.

## Archive (`tests/archive/`)

Contains **superseded tests preserved for reference**:

- **`archive/e2e/`** — Original phase-by-phase e2e tests (p1p2-smoke, p2t2-integration, p3t3-attack, p4t4-detection, p5t5-resilience, phase aggregators, monitoring, peer discovery). May still work against production Docker (ports 3000-3004).
- **`archive/security/`** — Original security test suite with orchestrator and detailed test plan docs. Superseded by `categories/security-suite.sh`.

These were the original tests covering each development phase individually. The consolidated `categories/` scripts combine their coverage and run against the isolated test Docker stack.

## Deprecated (`tests/deprecated/`)

Contains **removed test scripts preserved with code**:

- **`quick-test.sh`** — Original smoke test with hardcoded production ports. Superseded by `categories/smoke-test.sh`.
- **`run-comprehensive-tests.sh`** — Original phase 3-5 runner. Had broken references and division-by-zero bugs. Replaced by `run-tests.sh` interactive menu.

## Results

Test output saved to `tests/results/` directory. Each run generates timestamped logs.
