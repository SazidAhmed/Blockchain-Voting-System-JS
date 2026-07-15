# Test Architecture Overview

## Integration-Only Testing

No unit test framework configured — `npm test` is a stub in all services. All testing is integration-only via shell scripts against a running Docker stack.

## 6 Test Categories

| Category    | File                                   | Coverage                                                 |
| ----------- | -------------------------------------- | -------------------------------------------------------- |
| Smoke       | `tests/categories/smoke-test.sh`       | Health, login, vote, double-vote, DB persistence         |
| Integration | `tests/categories/integration-test.sh` | Full vote lifecycle, blockchain propagation, audit trail |
| Attack      | `tests/categories/attack-test.sh`      | Tampered ballot, replay, SQLi, no-auth, JWT, rate-limit  |
| Detection   | `tests/categories/detection-test.sh`   | Node health, chain consistency, Merkle statistics        |
| Security    | `tests/categories/security-suite.sh`   | No-auth vote, nullifier uniqueness, XSS, rate-limit      |
| Resilience  | `tests/categories/resilience-test.sh`  | Node restart, sync, backend restart                      |

## Isolated Test Stack

Tests run against a separate Docker stack using offset ports — no interference with dev environment:

| Service          | Dev Port  | Test Port |
| ---------------- | --------- | --------- |
| MySQL            | 3306      | 3307      |
| Backend          | 3000      | 3005      |
| Blockchain nodes | 3001-3004 | 3010-3013 |
| Frontend         | 5173      | 5175      |
| Institution API  | 4000      | 4005      |

Defined in `infra/docker/docker-compose.test.yml`. Separate network (`voting-test-network`) and volumes.

## Interactive Runner

```bash
bash tests/run-tests.sh
```

Menu-driven. Supports single category, range selection, or "Run All". Backend restarts between categories to reset rate-limiter state.

## Test Config

`tests/test-config.sh` centralizes all URLs, ports, credentials, and helper functions. Sources `.env.test` if present. Override any variable via environment.

## Seed Data

| Script                                   | Data                                         | Used By                 |
| ---------------------------------------- | -------------------------------------------- | ----------------------- |
| `infra/scripts/seed-test-data.sh`        | 3 elections, 15 candidates, 6 voters         | Run All, security-suite |
| `infra/scripts/seed-test-smoke.sh`       | 1 active election, 3 candidates, 1 voter     | smoke-test              |
| `infra/scripts/seed-test-integration.sh` | 1 active election, 5 candidates, 2 voters    | integration-test        |
| `infra/scripts/seed-test-attack.sh`      | Tampered chain data, malicious voter records | attack-test             |
| `infra/scripts/seed-test-detection.sh`   | Byzantine configs, suspicious activity logs  | detection-test          |
| `infra/scripts/seed-test-resilience.sh`  | Multi-node state, partition scenario data    | resilience-test         |

Expected values for assertions defined in `infra/scripts/seed-test-expected-values.sh`.

## Directory Layout

```text
tests/
├── run-tests.sh              # Interactive test runner
├── test-config.sh            # Centralized config + helpers
├── categories/               # Active test scripts (6)
│   ├── smoke-test.sh
│   ├── integration-test.sh
│   ├── attack-test.sh
│   ├── detection-test.sh
│   ├── security-suite.sh
│   └── resilience-test.sh
├── archive/                  # Superseded tests (reference only)
├── deprecated/               # Removed tests (code + reasons)
└── results/                  # Timestamped test output
```
