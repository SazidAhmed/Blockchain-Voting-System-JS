# Code Conventions

## Branch Naming

```text
fix/       — Bug fix
feat/      — New feature
docs/      — Documentation
refactor/  — Code restructuring
ci/        — CI/CD changes
chore/     — Dependencies, tooling
```

## Commit Messages

Format: `type(scope): description`

| Part          | Rules               | Examples                                                |
| ------------- | ------------------- | ------------------------------------------------------- |
| `type`        | Required            | `fix`, `feat`, `docs`, `refactor`, `ci`, `chore`        |
| `scope`       | Optional            | `backend`, `frontend`, `blockchain`, `docker`, `voting` |
| `description` | Required, ≤72 chars | `handle null election ID`, `add ballot encryption`      |

Enforced by pre-push (`scripts/run-all-checks.sh`) and CI.

## Pull Requests

- **Title**: same format as commit: `type(scope): description`
- **Description**: summary, related issue (`Closes #123`), change list, checklist
- **Merge**: squash and merge — commit message auto-fills from PR title

## Git Hooks

Configured via `git config core.hooksPath .githooks`.

### pre-commit (runs on `git commit`)

1. Secrets scan — blocks API keys, passwords, private keys
2. JavaScript syntax check — blocks staged .js files with errors
3. Console.log warning — warns (non-blocking) on backend `console.log`

### pre-push (runs on `git push`)

Runs `scripts/run-all-checks.sh`: branch name, commit message, secrets, syntax, console.log, env coverage.

## CI

`bash scripts/ci.sh` — runs locally and in GitHub Actions (`docker-build.yml`). Single source of truth.

Static checks (no Docker): `bash scripts/run-all-checks.sh`

## AI Agents

- **AGENTS.md** (root) — architecture, commands, conventions for AI assistants
- **`.opencode/`** — opencode settings and custom skills
- AI docs live in `docs/` organized by domain
