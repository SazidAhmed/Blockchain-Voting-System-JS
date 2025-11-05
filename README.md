# University Blockchain Voting System

![Status](https://img.shields.io/badge/status-development-yellow)
![Completion](https://img.shields.io/badge/completion-60%25-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

A secure, privacy-preserving blockchain-based voting system for university elections using modern cryptographic techniques.

## 🎉 Project Status

**Current Phase:** Production-Ready Infrastructure - Docker & Monitoring Complete  
**Last Updated:** November 5, 2025  
**Completion:** 85% (~18,000+ lines of code)

### ✅ Fully Implemented:
- ✅ **Complete Docker Setup** - One-command deployment with 5 services
- ✅ **Monitoring Stack** - Prometheus, Grafana, cAdvisor with pre-built dashboards
- ✅ **Helper Scripts** - Backup, restore, logs, health checks, cleanup utilities
- ✅ **Client-side Cryptography** - ECDSA P-256 signatures, RSA-OAEP encryption
- ✅ **Encrypted Voting** - End-to-end vote casting with signatures and nullifiers
- ✅ **Double-vote Prevention** - Nullifier-based duplicate detection
- ✅ **Database Storage** - MySQL with complete schema and migrations
- ✅ **Blockchain Node** - Custom PoW blockchain with persistent storage

### 🔜 Remaining Tasks:
- Frontend integration testing (Priority 1)
- Merkle proof implementation
- Multi-factor authentication
- BFT consensus upgrade
- Production security hardening

---

## � Key Security Features

- ✅ **Ballot Secrecy** - RSA-OAEP 2048-bit encryption
- ✅ **Voter Authentication** - ECDSA P-256 digital signatures
- ✅ **Vote Privacy** - SHA-256 unlinkable nullifiers
- ✅ **Double-Vote Prevention** - Nullifier-based duplicate detection
- ✅ **Non-Repudiation** - Cryptographic vote receipts
- ✅ **Audit Logging** - Complete security event tracking
- ✅ **Rate Limiting** - DDoS protection on all endpoints

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
docker-compose up --build -d

# Or use the helper script:
# On Linux/Mac:
./docker-start.sh

# On Windows:
docker-start.bat
```

**Access the application:**
- 🖥️ **Frontend**: http://localhost:5173
- 🔧 **Backend API**: http://localhost:3000
- ⛓️ **Blockchain**: http://localhost:3001
- 🗄️ **phpMyAdmin**: http://localhost:8080

**Done!** All 5 services running in Docker containers. See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for details.

### 📊 Monitoring (Optional but Recommended)

Start the monitoring stack to track system performance:

```bash
# Start Prometheus, Grafana, cAdvisor, and exporters
./docker-monitoring-start.sh

# Or manually:
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

**Access Monitoring Tools:**
- 📈 **Grafana**: http://localhost:3030 (admin/admin)
- 📊 **Prometheus**: http://localhost:9090
- 🐳 **cAdvisor**: http://localhost:8081

**Features:**
- Real-time service health monitoring
- Container resource usage (CPU, memory, network)
- MySQL database metrics
- Pre-configured dashboards
- Automatic alerting for issues

See [MONITORING_GUIDE.md](./MONITORING_GUIDE.md) for complete documentation.

---

## �️ Management Tools

### Helper Scripts
```bash
./docker-health-check.sh    # Check system health
./docker-backup.sh           # Backup database & blockchain
./docker-restore.sh <file>   # Restore from backup
./docker-logs.sh             # Interactive log viewer
./docker-cleanup.sh          # Clean Docker resources
./docker-seed.sh             # Seed test data
```

### Testing
```bash
# Health check all services
./docker-health-check.sh

# Run backend tests
docker-compose exec backend npm test

# Integration tests
node test-system.js
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
- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Complete Docker setup guide
- **[DOCKER_QUICK_REFERENCE.md](./DOCKER_QUICK_REFERENCE.md)** - Quick Docker commands
- **[HELPER_SCRIPTS_REFERENCE.md](./HELPER_SCRIPTS_REFERENCE.md)** - All helper scripts
- **[MONITORING_GUIDE.md](./MONITORING_GUIDE.md)** - Prometheus & Grafana setup
- **[DOCKER_TEST_RESULTS.md](./DOCKER_TEST_RESULTS.md)** - Docker test report

### Development Documentation
- **20_10_25.md** - Client-side cryptography implementation
- **21_10_25.md** - Backend integration and testing session
- **CRYPTO_IMPLEMENTATION.md** - Technical API reference
- **CRYPTO_QUICK_START.md** - Testing guide
- **CRYPTO_VISUAL_GUIDE.md** - Architecture diagrams
- **DATABASE_SCHEMA.md** - Database documentation

### Helper Scripts (New! ✨)
- `docker-backup.sh` - Backup database and blockchain
- `docker-restore.sh` - Restore from backups
- `docker-logs.sh` - Advanced log viewer
- `docker-cleanup.sh` - Clean Docker resources
- `docker-health-check.sh` - System health check
- `docker-seed.sh` - Seed test data
- `docker-monitoring-start.sh` - Start monitoring stack

## 🔄 Vote Casting Flow

```
Registration → Key Generation → Vote → Encrypt → Sign → Verify → Store → Blockchain
```

**Detailed Flow:**
1. User registers → ECDSA + RSA keypairs generated client-side
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

- **Email:** sazidahmed.official@gmail.com  
- **GitHub:** [@SazidAhmed](https://github.com/SazidAhmed)  
- **Issues:** [Report bugs or request features](https://github.com/SazidAhmed/Blockchain-Voting-System-JS/issues)

---

## ⚠️ Security Notice

**This is an academic/development project (85% complete).**

**Before production use, ensure:**
1. Professional security audit by cryptography experts
2. Comprehensive penetration testing
3. Secure key storage (HSM or encrypted key stores)
4. Legal compliance review for your jurisdiction
5. Load testing for expected voter volume

**Current Status:** Suitable for demonstrations, testing, and educational purposes.

---

**Last Updated:** November 5, 2025  
**Status:** Infrastructure Complete - 85% Done  
**Next:** Frontend integration testing & security hardening
