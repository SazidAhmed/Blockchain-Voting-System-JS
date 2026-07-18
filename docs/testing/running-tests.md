# Running Tests

## Prerequisites

- Docker and Docker Compose installed
- Test Docker stack running on offset ports (no interference with dev)

## Start Test Stack

```bash
docker-compose -f infra/docker/docker-compose.test.yml up -d
```

Separate network, volumes, and ports. Backend auto-runs migrations on boot.

## Interactive Runner

```bash
bash tests/run-tests.sh
```

Menu options:

- `1` — Quick Smoke Test (health, login, vote, double-vote)
- `2` — Integration Tests (vote lifecycle, blockchain verification)
- `3` — Security Attacks (tampered ballot, replay, SQLi, no-auth, JWT)
- `4` — Malicious Detection (node health, chain consistency, Merkle stats)
- `5` — Resilience Tests (node restart, sync, backend restart)
- `6` — Full Security Suite (no-auth vote, nullifier, XSS, rate-limit)
- `7` / `a` — Run All (full reset + all 6 categories)
- `q` — Quit

Supports range selection (e.g. `1-3`) and space-separated numbers.

## Single Category

```bash
bash tests/run-tests.sh smoke-test
bash tests/run-tests.sh all
bash tests/run-tests.sh --help
```

Available category names: `smoke-test`, `integration-test`, `attack-test`, `detection-test`, `security-suite`, `resilience-test`.

## Full Reset + All Categories

```bash
bash tests/run-tests.sh all
```

Resets stack (`docker compose down -v`, rebuilds, seeds), then runs all 6 categories sequentially with backend restart between each.

## Test Config

All settings in `tests/test-config.sh`. Overridable via environment variables or `.env.test`:

| Variable           | Default                     |
| ------------------ | --------------------------- |
| `BACKEND_URL`      | `http://localhost:3005/api` |
| `SEED_ADMIN_ID`    | `ADMIN001`                  |
| `SEED_ADMIN_PASS`  | `admin123`                  |
| `SEED_VOTER_EMAIL` | `demo-voter@university.edu` |
| `SEED_VOTER_PASS`  | `DemoPass123!`              |
| `MYSQL_PORT`       | `3307`                      |
| `BLOCKCHAIN_PORTS` | `3010 3011 3012 3013`       |

## Results

Output saved to `tests/results/` with timestamped log files.

## Seed Scripts

| Seed Script                              | Contents                                             |
| ---------------------------------------- | ---------------------------------------------------- |
| `infra/scripts/seed-test-data.sh`        | Comprehensive — 3 elections, 15 candidates, 6 voters |
| `infra/scripts/seed-test-smoke.sh`       | 1 active election, 3 candidates, 1 voter             |
| `infra/scripts/seed-test-integration.sh` | 1 active election, 5 candidates, 2 voters            |
| `infra/scripts/seed-test-attack.sh`      | Tampered chain data, malicious voter records         |
| `infra/scripts/seed-test-detection.sh`   | Byzantine configs, suspicious activity logs          |
| `infra/scripts/seed-test-resilience.sh`  | Multi-node state, partition scenario data            |
