# Deprecated Files

These files are **deprecated — preserved with code for reference**. Unlike
`tests/archive/` (which holds intact but superseded tests), these files have
been superseded by the new consolidated test runner. They are kept here so no
code is lost during reorganization.

## Preserved Files

| File | Reason for Deprecation |
| ---- | ---------------------- |
| `quick-test.sh` | Superseded by `tests/categories/smoke-test.sh`. No unique coverage — consolidated script covers same flow (health, register, login, vote, double-vote) plus uses isolated test Docker. |
| `run-comprehensive-tests.sh` | Broken beyond repair. Referenced 3 non-existent files, had division-by-zero bug in phase timing, assumed local (not Docker) services. Replaced by interactive menu (`tests/run-tests.sh`). |

## Notes

- Both scripts use production ports (3000, 3306) — will not work with test Docker
- `quick-test.sh` uses old auth endpoints (`/auth/register`, `/auth/login`) replaced by `/users/login`
- `run-comprehensive-tests.sh` references `e2e/p3-*.sh`, `e2e/p4-*.sh`, `e2e/p5-*.sh` now in `tests/archive/e2e/`
