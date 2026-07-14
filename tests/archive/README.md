# Archived Tests

These tests are **preserved but deprecated**. They used to work and may still work
against the production Docker stack (ports 3000-3004), but are no longer actively
maintained. All new development should use `tests/categories/` scripts which
run against the isolated test Docker stack (`docker-compose.test.yml`).

## Contents

### e2e/ — Individual phase tests

| File | Reason Archived |
|------|-----------------|
| `p1p2-smoke-test.sh` | Superseded by `categories/smoke-test.sh` |
| `p2t2-*.sh` (4 files) | Superseded by `categories/integration-test.sh` |
| `p3t3-*.sh` (5 files) | Superseded by `categories/attack-test.sh` |
| `p4t4-*.sh` (3 files) | Superseded by `categories/detection-test.sh` |
| `p5t5-*.sh` (3 files) | Superseded by `categories/resilience-test.sh` |
| `tools/double_vote_test.sh` | Superseded by double-vote check in `categories/smoke-test.sh` |

### security/ — Security test suite

| File | Reason Archived |
|------|-----------------|
| `test-security-orchestrator.sh` | Superseded by `categories/security-suite.sh` |
| All `*.md` in security/ | Documentation integrated into `categories/security-suite.sh` |

## Running Archived Tests

These scripts were written for the original production ports (3000-3004, 3306).
They will NOT work with the test Docker stack (3005/3010-3013/3307) without
manual port changes.

To use them, point to the production stack:
```bash
cd tests/archive/e2e
./p1p2-smoke-test.sh   # expects backend at localhost:3000
```

No guarantees they still function — they are kept for reference only.
