# CI Integration

## Workflows

### CI (`docker-build.yml`)

Triggers on push/PR to `main` or `develop`. Runs:

1. **`scripts/ci.sh`** — single source of truth, runs locally and in CI:
   - Secrets scan (`scripts/check-secrets.sh`)
   - JS syntax check (`scripts/check-syntax.sh`)
   - Branch name validation (`scripts/check-branch-name.sh`)
   - `.env.example` check (`scripts/check-env-example.sh`)
   - Docker build
   - Service startup with `docker-compose.yml`
   - Health check (backend API, blockchain node, frontend)
   - Cleanup (`docker compose down -v`)

2. **Trivy vulnerability scan** — filesystem scan, results uploaded to GitHub Security tab.

On failure, docker logs output for debugging.

### PR Automation (`pr-automation.yml`)

Triggers on PR open/sync/reopen/edit. Three jobs:

- **auto-label** — Labels PR by changed paths via `.github/labeler.yml`
- **pr-validation** — Validates title format (Conventional Commits), checks description length (≥20 chars), enforces linked issue reference
- **pr-comment** — Posts/updates CI summary comment on PR

## CI Script

`scripts/ci.sh` is designed to run identically in CI and locally:

```bash
bash scripts/ci.sh
```

Exits 0 on success, 1 on failure.

## Workflow Reference

See [github-workflow.md](../development/github-workflow.md) for full PR and branch workflow.
