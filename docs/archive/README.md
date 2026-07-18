# Docs Archive

Archived on 2026-07-15 during docs restructure.

## Contents

Preserved directory structure inside `docs-archive.zip`:

| Directory | Files | Description |
|-----------|-------|-------------|
| `database/` | 3 | DATABASE_SCHEMA, SETUP, QUICK_REFERENCE |
| `deployment/` | 2 | frontend-setup, MONITORING_README |
| `development/` | 3 | CRYPTO_IMPLEMENTATION, PHASE2/3 QUICKSTART |
| `project-structure.md` | 1 | Old project tree |
| `security/` | 1 | implementation.txt |
| `project-status/archive/` | 39 | Dated status reports, phase completions (Oct 2025 – Mar 2026) |
| `project-status/checklists/` | 6 | Deployment, testing, verification checklists |
| `project-status/crypto/` | 4 | Crypto guides, Merkle tree, success notes |
| `project-status/database/` | 4 | Database completion, improvements, index |
| `project-status/docker/` | 3 | Docker commands, quick reference, setup |
| `project-status/guides/` | 27 | Phase completion guides, integration status, quick starts |
| `project-status/monitoring/` | 9 | Grafana, Loki, monitoring guides and reports |
| `project-status/plans/` | 2 | November plan, mobile mining |
| `project-status/security/` | 5 | Security audit, monitoring, operations playbook |
| `project-status/testing/` | 21 | Test plans, results, session logs (all phases) |

**Total: ~160 files**

## Extract

```bash
# PowerShell
Expand-Archive -Path docs/archive/docs-archive.zip -DestinationPath docs/archive/extracted

# Linux/macOS
unzip docs/archive/docs-archive.zip -d docs/archive/extracted
```

Note: these are pre-restructure historical docs. Some info may be stale or redundant. New docs live in `docs/` root folders.
