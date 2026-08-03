# Setup Guide

## Prerequisites

- Docker Desktop (includes Docker Compose)
- Node.js 18+ (local dev only)
- Ports free: 3000, 3001-3004, 3306, 5173, 5174, 4000, 8080
- 4 GB+ free RAM

---

## Full Stack (Docker)

### 1. Clone

```bash
git clone https://github.com/SazidAhmed/Blockchain-Voting-System-JS.git
cd Blockchain-Voting-System-JS
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` to change secrets (JWT_SECRET, DB passwords, BLOCKCHAIN_API_KEY, INSTITUTION_API_KEY). Defaults work for local dev.

### 3. Start

```bash
docker compose -f infra/docker/docker-compose.yml up --build -d
```

First build takes 2-3 minutes. Backend runs migrations automatically on boot.

### 4. Verify

```bash
bash infra/scripts/docker-health-check.sh
```

Expected: all containers `(healthy)`.

Access:

| Service         | URL                                   |
| --------------- | ------------------------------------- |
| Frontend        | <http://localhost:5173>               |
| Admin Panel     | <http://localhost:5174>               |
| Backend API     | <http://localhost:3000/api/elections> |
| Blockchain Node | <http://localhost:3001/node>          |
| phpMyAdmin      | <http://localhost:8080>               |
| MySQL           | localhost:3306                        |

### 5. Seed Admin Data

```bash
bash infra/scripts/docker-bootstrap.sh
```

---

## Local Development (No Docker)

### Backend Only

```bash
cd services/backend
npm install
cp .env.example .env      # edit DB credentials
npm run migrate
npm run dev
```

Requires MySQL running on host. Listens on port 3000.

### Frontend Only

```bash
cd services/frontend
npm install
npm run dev
```

Listens on port 5173. Point `VITE_API_BASE_URL` at running backend.

### Blockchain Node Only

```bash
cd services/blockchain-node
npm install
npm run dev
```

Listens on port 3001. LevelDB data in `./data/`. Requires `BLOCKCHAIN_API_KEY` env var for API access.

---

## Production

```bash
cp .env.example .env
# Edit ALL secrets and URLs in .env (no defaults for production)
docker compose -f infra/docker/docker-compose.prod.yml up --build -d
```

Create `infra/docker/nginx/ssl/` and place SSL certs there. Frontend uses `Dockerfile.prod` (static build). Only Nginx ports (80, 443) are exposed.

---

## Run Tests

```bash
docker compose -f infra/docker/docker-compose.test.yml up -d
bash tests/run-tests.sh
```

Or run all: `bash tests/run-tests.sh all`.

---

## Troubleshooting

### Port conflicts

```powershell
# Windows — find and kill process on port
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Docker not running

```bash
docker info
# Should not error. Start Docker Desktop if needed.
```

### Container won't start

```bash
# Check logs
docker compose -f infra/docker/docker-compose.yml logs <service>

# Rebuild without cache
docker compose -f infra/docker/docker-compose.yml build --no-cache <service>
```

### MySQL not healthy

```bash
docker compose -f infra/docker/docker-compose.yml logs mysql | grep "ready for connections"
docker compose -f infra/docker/docker-compose.yml restart backend
```

### Migration errors

```bash
docker compose -f infra/docker/docker-compose.yml exec backend npm run migrate
docker compose -f infra/docker/docker-compose.yml exec backend npm run migrate:status
```

### Reset everything (DELETES DATA)

```bash
docker compose -f infra/docker/docker-compose.yml down -v
docker system prune -a --volumes
docker compose -f infra/docker/docker-compose.yml up --build -d
```
