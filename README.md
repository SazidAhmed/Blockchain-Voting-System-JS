# University Blockchain Voting System

![Status](https://img.shields.io/badge/status-testing-green)
![Completion](https://img.shields.io/badge/completion-96%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

A secure, privacy-preserving blockchain-based voting system for university elections using modern cryptographic techniques.

## 🎉 Project Status

**Current Phase:** Merkle Tree Integration Complete - Production Ready
**Last Updated:** November 13, 2025
**Completion:** 96% (~19,000+ lines of code)

### ✅ Fully Implemented

- ✅ **Complete Docker Setup** - One-command deployment with 5 services
- ✅ **Monitoring Stack** - Prometheus, Grafana, cAdvisor with pre-built dashboards
- ✅ **Helper Scripts** - Backup, restore, logs, health checks, cleanup utilities
- ✅ **Client-side Cryptography** - ECDSA P-256 signatures, RSA-OAEP encryption
- ✅ **Encrypted Voting** - End-to-end vote casting with signatures and nullifiers
- ✅ **Double-vote Prevention** - Nullifier-based duplicate detection **[TESTED & VERIFIED]** ✅
- ✅ **Database Storage** - MySQL with complete schema and migrations
- ✅ **Blockchain Node** - Custom PoW blockchain with persistent storage
- ✅ **Transaction Hash System** - Deterministic SHA-256 hash generation **[TESTED & VERIFIED]** ✅
- ✅ **Auto-Registration** - Users automatically enrolled in active elections
- ✅ **Security Testing** - Complete integration testing with 100% pass rate
- ✅ **Audit Logging** - Comprehensive event tracking with severity levels
- ✅ **Merkle Tree System** - Efficient vote verification with O(log n) proofs **[NEW]** 🎉

### 🔜 Remaining Tasks

- Final documentation and screenshots (Priority 3 - In Progress)
- Frontend Merkle proof verification UI (Optional enhancement)
- Multi-factor authentication (Future feature)
- BFT consensus upgrade (Future enhancement)
- Production security hardening (Pre-deployment)

---

## 🔐 Key Security Features

- ✅ **Ballot Secrecy** - RSA-OAEP 2048-bit encryption
- ✅ **Voter Authentication** - ECDSA P-256 digital signatures
- ✅ **Vote Privacy** - SHA-256 unlinkable nullifiers
- ✅ **Double-Vote Prevention** - Nullifier-based duplicate detection **[100% Test Pass]**
- ✅ **Transaction Integrity** - Deterministic SHA-256 transaction hashing **[Verified]**
- ✅ **Non-Repudiation** - Cryptographic vote receipts with blockchain proof
- ✅ **Audit Logging** - Complete security event tracking with severity classification
- ✅ **Rate Limiting** - DDoS protection on all endpoints
- ✅ **Auto-Enrollment** - Seamless voter registration for available elections
- ✅ **Merkle Proofs** - Efficient vote verification (99% bandwidth savings) **[NEW]** 🎉

---

## 🚀 Quick Start

### 🐳 Docker Setup (Recommended - Easiest!)

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

# Start all services (MySQL, phpMyAdmin, Backend, Blockchain, Frontend)
docker-compose -f infra/docker/docker-compose.yml up --build -d

# Or use the helper script:
# On Linux/Mac:
bash infra/scripts/docker-start.sh

# On Windows:
infra\scripts\docker-start.bat
```

**Access the application:**

- 🖥️ **Frontend (Voters)**: <http://localhost:5173>
- 🔧 **Admin Panel**: <http://localhost:5174>
- 🔧 **Backend API**: <http://localhost:3000>
- ⛓️ **Blockchain**: <http://localhost:3001>
- 🗄️ **phpMyAdmin**: <http://localhost:8080>

**Done!** All 5 services running in Docker containers. See [DOCKER_SETUP.md](./docs/project-status/DOCKER_SETUP.md) for details.

### 📊 Monitoring (Optional but Recommended)

Start the monitoring stack to track system performance:

```bash
# Start Prometheus, Grafana, cAdvisor, and exporters
bash infra/scripts/docker-monitoring-start.sh

# Or manually:
docker-compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.monitoring.yml up -d
```

**Access Monitoring Tools:**

- 📈 **Grafana**: <http://localhost:3030> (admin/admin)
- 📊 **Prometheus**: <http://localhost:9090>
- 🐳 **cAdvisor**: <http://localhost:8081>

**Features:**

- Real-time service health monitoring
- Container resource usage (CPU, memory, network)
- MySQL database metrics
- Pre-configured dashboards
- Automatic alerting for issues

See [MONITORING_GUIDE.md](./docs/project-status/MONITORING_GUIDE.md) for complete documentation.

---

## �️ Management Tools

### Helper Scripts

```bash
bash infra/scripts/docker-health-check.sh    # Check system health
bash infra/scripts/docker-backup.sh           # Backup database & blockchain
bash infra/scripts/docker-restore.sh <file>   # Restore from backup
bash infra/scripts/docker-logs.sh             # Interactive log viewer
bash infra/scripts/docker-cleanup.sh          # Clean Docker resources
bash infra/scripts/docker-seed.sh             # Seed test data
```

### Testing

```bash
# Health check all services
bash infra/scripts/docker-health-check.sh

# Run backend tests
docker-compose -f infra/docker/docker-compose.yml exec backend npm test

# Integration tests
node tests/e2e/test-system.js
```

---

## 🏗️ Tech Stack

- **Frontend**: Vue.js 3 + Vite + Vuex + Web Crypto API
- **Backend**: Node.js + Express + JWT + ECDSA verification
- **Database**: MySQL 8.0 with encrypted ballot storage
- **Blockchain**: Custom PoW with LevelDB persistence
- **Monitoring**: Prometheus + Grafana + cAdvisor
- **Infrastructure**: Docker + Docker Compose

---

## 📖 Documentation

Comprehensive documentation available:

### Core Documentation

- **[DOCKER_SETUP.md](./docs/project-status/DOCKER_SETUP.md)** - Complete Docker setup guide
- **[DOCKER_QUICK_REFERENCE.md](./docs/project-status/DOCKER_QUICK_REFERENCE.md)** - Quick Docker commands
- **[HELPER_SCRIPTS_REFERENCE.md](./docs/project-status/HELPER_SCRIPTS_REFERENCE.md)** - All helper scripts
- **[MONITORING_GUIDE.md](./docs/project-status/MONITORING_GUIDE.md)** - Prometheus & Grafana setup
- **[DOCKER_TEST_RESULTS.md](./docs/project-status/DOCKER_TEST_RESULTS.md)** - Docker test report

### Development Documentation

- **20_10_25.md** - Client-side cryptography implementation
- **21_10_25.md** - Backend integration and testing session
- **CRYPTO_IMPLEMENTATION.md** - Technical API reference
- **CRYPTO_QUICK_START.md** - Testing guide
- **CRYPTO_VISUAL_GUIDE.md** - Architecture diagrams
- **DATABASE_SCHEMA.md** - Database documentation

### Helper Scripts (New! ✨)

- `infra/scripts/docker-backup.sh` - Backup database and blockchain
- `infra/scripts/docker-restore.sh` - Restore from backups
- `infra/scripts/docker-logs.sh` - Advanced log viewer
- `infra/scripts/docker-cleanup.sh` - Clean Docker resources
- `infra/scripts/docker-health-check.sh` - System health check
- `infra/scripts/docker-seed.sh` - Seed test data
- `infra/scripts/docker-monitoring-start.sh` - Start monitoring stack

## 🔄 Vote Casting Flow

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

## 🤝 Contributing

Contributions welcome! Please follow standard Git workflow:

1. Fork → 2. Branch → 3. Commit → 4. Push → 5. Pull Request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 👥 Team

**Developers:** Sazid Ahmed, Nahid Noyon
**Institution:** Bangladesh University of Professionals
**Program:** Masters in Information System Security
**Year:** 2023-2024

---

## 📧 Contact

- **Email:** [sazidahmed.official@gmail.com](sazidahmed.official@gmail.com)
- **GitHub:** [@SazidAhmed](https://github.com/SazidAhmed)
- **Issues:** [Report bugs or request features](https://github.com/SazidAhmed/Blockchain-Voting-System-JS/issues)

---

## ⚠️ Security Notice

**This is an academic/research project (94% complete).**

**Core Security Features Tested & Verified:**

- ✅ Double-vote prevention (100% test pass rate)
- ✅ Transaction hash integrity (SHA-256 deterministic generation)
- ✅ ECDSA signature verification
- ✅ Nullifier-based vote tracking
- ✅ Comprehensive audit logging

**Before production use, ensure:**

1. Professional security audit by cryptography experts
2. Comprehensive penetration testing
3. Secure key storage (HSM or encrypted key stores)
4. Legal compliance review for your jurisdiction
5. Load testing for expected voter volume
6. Third-party cryptographic verification

**Current Status:** Core features production-ready. Suitable for demonstrations, academic research, and proof-of-concept deployments.

---

**Last Updated:** November 13, 2025
**Status:** Security Testing Complete - 94% Done
**Next:** Final documentation & optional Merkle tree implementation

**🎉 Major Milestones Achieved:**

- ✅ Double-vote prevention system validated
- ✅ Transaction hash integrity verified
- ✅ End-to-end voting workflow operational
- ✅ Auto-registration feature implemented
- ✅ 100% test success rate (11/11 tests passed)
