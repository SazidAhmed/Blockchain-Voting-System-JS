# University Blockchain Voting System

![Status](https://img.shields.io/badge/status-testing-green)
![Completion](https://img.shields.io/badge/completion-96%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

A secure, privacy-preserving blockchain-based voting system for university elections using modern cryptographic techniques.

## Project Status

**Current Phase:** Merkle Tree Integration Complete — Production Ready
**Last Updated:** July 28, 2026
**Completion:** 96% (~77,000+ lines of code)

### Fully Implemented

- **Complete Docker Setup** — One-command deployment with 10 services
- **Monitoring Stack** — Prometheus, Grafana, Loki, cAdvisor with pre-built dashboards
- **Helper Scripts** — Backup, restore, logs, health checks, cleanup utilities
- **Client-side Cryptography** — ECDSA P-256 signatures, RSA-OAEP 2048-bit encryption (native Web Crypto API)
- **Encrypted Voting** — End-to-end vote casting with signatures and client-supplied nullifiers
- **Encrypted Tally** — AES-256-GCM encrypted vote tallying with admin release
- **Double-vote Prevention** — Nullifier-based duplicate detection with UNIQUE constraint [TESTED & VERIFIED]
- **Database Storage** — MySQL with complete schema and migrations
- **Blockchain Node** — Custom PoW blockchain with LevelDB persistence, 4-node peer network with persistent ECDSA keys
- **Transaction Hash System** — Deterministic SHA-256 hash generation [TESTED & VERIFIED]
- **Auto-Registration** — Users automatically enrolled in active elections
- **Integration Testing** — Shell-based test suite: smoke, integration, attack, detection, security, resilience
- **Audit Logging** — Admin audit trails with hash-chain integrity verification
- **Merkle Tree System** — Efficient vote verification with O(log n) proofs

### Remaining Tasks

- Frontend Merkle proof verification UI (Optional enhancement)
- Multi-factor authentication (Future feature)
- BFT consensus upgrade (Future enhancement)
- Production security hardening (Pre-deployment)

---

## Key Security Features

- **JWT Security** — HS256 algorithm restricted, token in httpOnly cookie only (not response body)
- **Ballot Secrecy** — RSA-OAEP 2048-bit encryption
- **Voter Authentication** — ECDSA P-256 digital signatures (native crypto.verify)
- **Vote Privacy** — Client-supplied SHA-256 nullifiers (not server-derived)
- **Double-vote Prevention** — UNIQUE constraint on nullifier_hash, ER_DUP_ENTRY handling [100% Test Pass]
- **Transaction Integrity** — Deterministic SHA-256 transaction hashing [Verified]
- **Non-Repudiation** — Cryptographic vote receipts with opaque receipt ID (nullifier never exposed)
- **Audit Logging** — Complete security event tracking with hash-chain integrity
- **Rate Limiting** — DDoS protection on all endpoints (institution API, backend, blockchain)
- **Auto-Enrollment** — Seamless voter registration for available elections
- **Merkle Proofs** — Efficient vote verification (99% bandwidth savings)
- **Helmet Security** — CSP, HSTS, X-Frame-Options on all services

---

## Quick Start

### Docker Setup (Recommended)

**Prerequisites:**

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- At least 4GB of free RAM

**One-Command Setup:**

```bash
# Clone repository
git clone https://github.com/SazidAhmed/Blockchain-Voting-System-JS.git
cd Blockchain-Voting-System-JS

# Copy environment file
cp .env.example .env

# Start all services (MySQL, phpMyAdmin, Backend, 4 Blockchain Nodes, Frontend, Admin Panel, Institution API)
docker compose -f infra/docker/docker-compose.yml --env-file .env up --build -d

# Or use the helper script:
# On Linux/Mac:
bash infra/scripts/docker-start.sh

# On Windows:
infra\scripts\docker-start.bat
```

**Access the application:**

- **Frontend (Voters)**: <http://localhost:5173>
- **Admin Panel**: <http://localhost:5174>
- **Backend API**: <http://localhost:3000>
- **Blockchain Node**: <http://localhost:3001>
- **phpMyAdmin**: <http://localhost:8080>

See [deployment/setup.md](docs/deployment/setup.md) for detailed setup guide.

### 📊 Monitoring (Optional)

Start the monitoring stack to track system performance:

```bash
# Start Prometheus, Grafana, cAdvisor, and exporters
bash infra/scripts/docker-monitoring-start.sh
# Or manually:
docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.monitoring.yml --env-file .env up -d
```

- **Grafana**: <http://localhost:3030> (admin/admin)
- **Prometheus**: <http://localhost:9090>
- **cAdvisor**: <http://localhost:8081>

See [monitoring/stack.md](docs/monitoring/stack.md) for complete monitoring documentation.

---

## Management Tools

### Helper Scripts

```bash
bash infra/scripts/docker-health-check.sh    # Check system health
bash infra/scripts/docker-backup.sh           # Backup database & blockchain
bash infra/scripts/docker-restore.sh <file>   # Restore from backup
bash infra/scripts/docker-logs.sh             # Interactive log viewer
bash infra/scripts/docker-cleanup.sh          # Clean Docker resources
bash infra/scripts/docker-bootstrap.sh        # Bootstrap admin, validators, config
```

### Testing

Integration tests require the Docker stack running. Use the interactive test runner:

```bash
bash tests/run-tests.sh           # Interactive menu
bash tests/run-tests.sh all       # Full suite (resets stack, seeds, runs all categories)
bash tests/run-tests.sh smoke-test  # Quick smoke test
```

Test categories: smoke-test, integration-test, detection-test, attack-test, security-suite, resilience-test.

---

## Tech Stack

- **Frontend**: Vue.js 3 + Vite + Vuex + Web Crypto API
- **Admin Panel**: Vue.js 3 + Vite + Pinia
- **Backend**: Node.js + Express 5 + JWT + ECDSA verification
- **Database**: MySQL 8.0 with encrypted ballot storage
- **Blockchain**: Custom PoW with LevelDB persistence, 4-node peer consensus
- **Institution API**: Express 4 + MySQL (mock directory)
- **Monitoring**: Prometheus + Grafana + cAdvisor + Loki
- **Infrastructure**: Docker + Docker Compose

---

## Documentation

Comprehensive documentation available in `docs/`:

| Domain                                                  | Description                                   |
| ------------------------------------------------------- | --------------------------------------------- |
| [Project Structure](docs/project/structure.md)          | Repository layout, file map                   |
| [Frontend](docs/frontend/README.md)                     | Vue 3 app: pages, components, crypto, theming |
| [Architecture](docs/architecture/overview.md)           | System design, blockchain mechanics, crypto   |
| [Database](docs/database/schema.md)                     | Schema, setup, migrations, reference          |
| [API - Backend](docs/api/backend.md)                    | Backend REST endpoints                        |
| [API - Blockchain Node](docs/api/blockchain-node.md)    | Blockchain node endpoints                     |
| [API - Institution](docs/api/institution-api.md)        | Institution directory API                     |
| [Deployment](docs/deployment/docker.md)                 | Docker compose files and setup                |
| [Environment Variables](docs/deployment/environment.md) | Full .env reference                           |
| [Development](docs/development/getting-started.md)      | Getting started, conventions, crypto impl     |
| [Testing](docs/testing/overview.md)                     | Test architecture, how to run, CI             |
| [Monitoring](docs/monitoring/stack.md)                  | Grafana, Prometheus, Loki, alerts             |
| [Security](docs/security/threat-model.md)               | Threat model, audit, operations               |
| [Knowledge Base](docs/knowledge/blockchain.md)          | Academic explainers                           |

---

## Vote Casting Flow

```text
Registration → Key Generation → Vote → Encrypt → Sign → Verify → Store → Blockchain
```

**Detailed Flow:**

1. User registers → ECDSA + RSA key pair generated client-side
2. User selects candidate → Ballot encrypted with election public key
3. Vote package signed with ECDSA private key
4. Backend verifies signature → Checks nullifier for duplicates
5. Encrypted ballot stored in database → Transaction submitted to blockchain
6. Cryptographic receipt returned to voter

---

## Contributing

Follow the Git workflow: Fork → Branch → Commit → Push → Pull Request.

See [development/github-workflow.md](docs/development/github-workflow.md) for full guide.

---

## License

MIT License — see [LICENSE](LICENSE) file for details.

---

## Team

**Developers:** Sazid Ahmed, Nahid Hasan Noyon
**Institution:** Bangladesh University of Professionals
**Program:** Masters in Information System Security
**Year:** 2023–2024

---

## Contact

- **Email**: <sazidahmed.official@gmail.com>
- **GitHub**: [@SazidAhmed](https://github.com/SazidAhmed)
- **Issues**: [Report bugs or request features](https://github.com/SazidAhmed/Blockchain-Voting-System-JS/issues)

---

## Security Notice

**This is an academic/research project (96% complete).** Core security features tested and verified. Before production use, ensure professional security audit, penetration testing, secure key storage, legal compliance review, load testing, and third-party cryptographic verification.

**Current Status:** Core features production-ready. Suitable for demonstrations, academic research, and proof-of-concept deployments.

**Major Milestones Achieved:**

- Double-vote prevention system validated
- Transaction hash integrity verified
- End-to-end voting workflow operational
- Auto-registration feature implemented
- 100% integration test success rate
- Merkle tree vote verification system
- Encrypted tally and results release
- Admin audit logging with integrity checks
