# Blockchain Voting System — Complete Development Guide

## Table of Contents

1. [One-Time Setup](#one-time-setup)
2. [Daily Workflow](#daily-workflow)
3. [Local Scripts](#local-scripts)
4. [Git Hooks](#git-hooks)
5. [GitHub Workflows](#github-workflows)
6. [Issue Templates](#issue-templates)
7. [Pull Request](#pull-request)
8. [Merge](#merge)
9. [File Map](#file-map)

---

## One-Time Setup

Run these once after cloning the repo:

```bash
# Clone the repo
git clone <your-repo-url>
cd Blockchain-Voting-System-JS

# Tell git to use our custom hooks
git config core.hooksPath .githooks

# Make scripts executable (Linux/Mac)
chmod +x scripts/*.sh .githooks/*

# Copy environment file
cp .env.example .env
```

That's it. Git hooks are now active.

---

## Daily Workflow

```text
Issue → Branch → Code → Commit → Push → Pull Request → Merge → Delete Branch
```

### Step 1: Create Branch

```bash
git checkout main && git pull
git checkout -b fix/docker-compose-command
```

Branch naming:

| Prefix      | When                  |
| ----------- | --------------------- |
| `fix/`      | Bug fix               |
| `feat/`     | New feature           |
| `docs/`     | Documentation         |
| `refactor/` | Code restructuring    |
| `ci/`       | CI/CD changes         |
| `chore/`    | Dependencies, tooling |

### Step 2: Make Changes

Edit files. Pre-commit hook runs automatically on commit.

### Step 3: Commit

```bash
git add .
git commit -m "fix(docker): replace docker-compose v1 with v2"
```

If the commit message format is wrong, the hook will block it and show the correct format.

### Step 4: Run Local Checks (Optional but Recommended)

```bash
bash scripts/ci.sh
```

Same script that runs in GitHub Actions. If it passes locally, it passes in CI.

### Step 5: Push

```bash
git push origin fix/docker-compose-command
```

The pre-push hook runs automatically. If any check fails, the push is blocked.

### Step 6: Create Pull Request

Go to GitHub → Pull Requests → New Pull Request.

- **Title**: same as commit format
- **Description**: what changed, why, link the issue

### Step 7: Merge

After CI passes, use **Squash and merge** for clean history.

---

## Local Scripts

All scripts are in `scripts/`. Run them from the project root.

### The One Script That Matters

| Script      | What it does                                                                                  | When to run                                                |
| ----------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **`ci.sh`** | **Full CI pipeline** — secrets, syntax, Docker build, start services, test endpoints, cleanup | Before pushing, or anytime you want to validate everything |

```bash
bash scripts/ci.sh
```

Single source of truth. Runs locally and in GitHub Actions.

### Individual Checks

| Script                  | What it does                                |
| ----------------------- | ------------------------------------------- |
| `check-secrets.sh`      | Scans for API keys, passwords, private keys |
| `check-syntax.sh`       | Validates JavaScript syntax                 |
| `check-console-logs.sh` | Warns about console.log in backend          |
| `check-docker.sh`       | Verifies Docker build                       |
| `check-env-example.sh`  | Checks .env.example covers all env vars     |
| `check-branch-name.sh`  | Validates branch name                       |
| `check-commit-msg.sh`   | Validates commit message format             |
| `run-all-checks.sh`     | All static checks (no Docker)               |

---

## Git Hooks

### pre-commit (`.githooks/pre-commit`)

Runs **automatically** when you `git commit`. Checks:

1. **Secrets** — blocks if API keys, passwords, or private keys are found
2. **Syntax** — blocks if staged .js files have syntax errors
3. **Console.log** — warns (does not block) if console.log is in backend code

### pre-push (`.githooks/pre-push`)

Runs **automatically** when you `git push`. Runs `run-all-checks.sh` (static checks, no Docker):

1. Branch name validation
2. Latest commit message format
3. Secrets scan
4. JavaScript syntax
5. Console.log warning
6. .env.example coverage

If any check fails, the push is blocked. Fix the issues and try again.

> **Why not ci.sh?** Docker build takes time. Pre-push runs fast static checks.
> Run `bash scripts/ci.sh` manually before important pushes if you want the full pipeline.

---

## GitHub Workflows

### docker-build.yml — CI Build & Test

**Triggers**: push to main/develop, pull requests to main/develop

**What it does**: Runs `bash scripts/ci.sh` — the same script you run locally.

```text
Checkout → Setup Docker → bash scripts/ci.sh → done
```

That's it. The workflow is a thin wrapper around `ci.sh`. All logic lives in the script.

**You see this**: green ✓ or red ✗ on your PR/commit.

### pr-automation.yml — PR Validation

**Triggers**: pull request opened, updated, or reopened

**What it does**:

1. **Auto-labels** PRs by which files changed (frontend, backend, blockchain, infra)
2. **Validates PR title** — must be `type(scope): description`
3. **Checks PR description** — must be at least 20 characters
4. **Warns on missing issue link** — should have `Closes #123`
5. **Posts CI summary comment** on the PR

---

## Issue Templates

When you click **New Issue** on GitHub, you see 6 options. Here's what each asks:

### 1. Bug Report → branch `fix/<description>`

| Field              | Required | What to write                                                                           |
| ------------------ | -------- | --------------------------------------------------------------------------------------- |
| Component          | Yes      | Which service: Frontend, Admin Panel, Backend, Blockchain Node, Institution API, Docker |
| Describe the bug   | Yes      | What happened vs what you expected                                                      |
| Steps to reproduce | Yes      | Numbered steps to trigger the bug                                                       |
| Relevant logs      | No       | Paste error output, console, or docker logs                                             |
| Environment        | Yes      | Docker, Local dev, or GitHub Actions                                                    |

**Example:**

- Component: `Backend (Express)`
- Description: `Voting endpoint returns 500 when election ID is null`
- Steps: `1. POST /api/votes with null electionId 2. See 500 error`
- Environment: `Docker (all services)`

### 2. Feature Request → branch `feat/<description>`

| Field             | Required | What to write                     |
| ----------------- | -------- | --------------------------------- |
| Problem           | Yes      | What frustration does this solve? |
| Proposed solution | Yes      | How should it work?               |
| Component         | Yes      | Which service it affects          |

**Example:**

- Problem: `No way to export election results`
- Solution: `Add CSV download button on admin dashboard`
- Component: `Admin Panel`

### 3. Documentation → branch `docs/<description>`

| Field                | Required | What to write                                            |
| -------------------- | -------- | -------------------------------------------------------- |
| Area                 | Yes      | README, API docs, Code comments, Deployment guide, Other |
| What needs to change | Yes      | What's missing or wrong                                  |

### 4. Refactor → branch `refactor/<description>`

| Field              | Required | What to write                              |
| ------------------ | -------- | ------------------------------------------ |
| Component          | Yes      | Which service                              |
| What should change | Yes      | Describe the restructuring                 |
| Why                | Yes      | Readability, maintainability, performance? |

### 5. CI/CD → branch `ci/<description>`

| Field                          | Required | What to write                                                             |
| ------------------------------ | -------- | ------------------------------------------------------------------------- |
| Type                           | Yes      | Bug (CI broken), Enhancement (new check), Infrastructure (Docker/scripts) |
| What happened or should change | Yes      | Describe the issue or improvement                                         |
| Relevant logs                  | No       | Paste CI output or Docker errors                                          |

### 6. Chore → branch `chore/<description>`

| Field                 | Required | What to write                                              |
| --------------------- | -------- | ---------------------------------------------------------- |
| Type                  | Yes      | Dependency update, Tooling change, Maintenance task, Other |
| What needs to be done | Yes      | Brief description                                          |

---

## Pull Request

When you click **New Pull Request**, fill in:

### Title

```text
type(scope): description
```

| Part        | Rules               | Examples                                                |
| ----------- | ------------------- | ------------------------------------------------------- |
| type        | Required            | `fix`, `feat`, `docs`, `refactor`, `ci`, `chore`        |
| scope       | Optional            | `backend`, `frontend`, `blockchain`, `docker`, `voting` |
| description | Required, ≤72 chars | `handle null election ID`, `add ballot encryption`      |

**Valid titles:**

```text
fix(backend): handle null election ID
feat(voting): add ballot encryption
ci(docker): replace docker-compose with docker compose
docs: update deployment guide
refactor(blockchain): simplify Merkle tree logic
```

**Invalid titles:**

```text
fixed bug                    ← no type prefix
Fix: something               ← capital F
fix backend thing            ← no scope syntax, no colon
```

### Description

Auto-filled from PR template. Fill in:

| Section       | What to write                        |
| ------------- | ------------------------------------ |
| Summary       | 1-2 sentences: what does this PR do? |
| Related Issue | `Closes #123` (links to the issue)   |
| Changes       | Bullet list of what changed          |
| Checklist     | Check the boxes you completed        |

**Example:**

```markdown
## Summary

Fixes CI failure where docker-compose command was not found on GitHub Actions runners.

## Related Issue

Closes #1

## Changes

- Replaced docker-compose v1 with docker compose v2
- Bumped actions/checkout to v4

## Checklist

- [x] Code follows project conventions
- [x] Docker build passes locally
- [x] No secrets committed
```

---

## Merge

After CI passes (green ✓), click **Squash and merge**.

| Field              | What to write                                                                     |
| ------------------ | --------------------------------------------------------------------------------- |
| Commit title       | Auto-filled from PR title: `fix(docker): replace docker-compose v1 with v2 (#12)` |
| Commit description | Auto-filled from PR description, or write: what changed, why                      |

**After merge:**

```bash
git checkout main && git pull
git branch -d fix/docker-compose-command
git push origin --delete fix/docker-compose-command
```

---

## File Map

```text
scripts/
  ci.sh                     # ← THE script (local + GitHub Actions)
  check-secrets.sh          # Scan for secrets
  check-syntax.sh           # Validate JS syntax
  check-console-logs.sh     # Warn on console.log
  check-docker.sh           # Verify Docker build
  check-env-example.sh      # Check env var coverage
  check-branch-name.sh      # Validate branch name
  check-commit-msg.sh       # Validate commit message
  run-all-checks.sh         # Run all static checks (no Docker)

.githooks/
  pre-commit                # Runs on git commit
  pre-push                  # Runs on git push

.github/
  workflows/
    docker-build.yml        # Calls scripts/ci.sh
    pr-automation.yml       # PR: label, validate, comment
  ISSUE_TEMPLATE/
    bug_report.yml          # Bug → fix/
    feature_request.yml     # Feature → feat/
    documentation.yml       # Docs → docs/
    refactor.yml            # Refactor → refactor/
    cicd.yml                # CI/CD → ci/
    chore.yml               # Chore → chore/
    config.yml              # Disables blank issues
  labeler.yml               # Maps file paths to PR labels
  pull_request_template.md  # PR description template
```

---

## Quick Reference

### Branch → Issue → Commit → PR Title

| Issue Type | Branch                   | Commit                                       | PR Title                                     |
| ---------- | ------------------------ | -------------------------------------------- | -------------------------------------------- |
| Bug Report | `fix/voting-null-id`     | `fix(backend): handle null election ID`      | `fix(backend): handle null election ID`      |
| Feature    | `feat/ballot-encryption` | `feat(voting): add ballot encryption`        | `feat(voting): add ballot encryption`        |
| Docs       | `docs/deploy-guide`      | `docs: update deployment guide`              | `docs: update deployment guide`              |
| Refactor   | `refactor/merkle-tree`   | `refactor(blockchain): simplify Merkle tree` | `refactor(blockchain): simplify Merkle tree` |
| CI/CD      | `ci/docker-compose`      | `ci(docker): replace docker-compose v1`      | `ci(docker): replace docker-compose v1`      |
| Chore      | `chore/update-express`   | `chore(backend): update express to 5.0.1`    | `chore(backend): update express to 5.0.1`    |

---

## Troubleshooting

**"pre-commit hook not running"**

```bash
git config core.hooksPath .githooks
```

**"Permission denied on scripts"**

```bash
git config core.hooksPath .githooks
```

**"Permission denied on scripts"**

```bash
chmod +x scripts/*.sh .githooks/*
```

**"Commit message rejected"**
Use format: `type(scope): description`
Example: `fix(backend): handle null election ID`

**"Push blocked by pre-push"**
Run `bash scripts/run-all-checks.sh` to see which check failed. Fix it, then push again.

**"PR title rejected"**
Same format as commit messages: `type(scope): description`
