# Getting Started

## Prerequisites

- **Node.js** 18+ (frontend requires ^20.19.0 or >=22.12.0)
- **Docker** & Docker Compose (for full stack)
- **MySQL** 8.0 (optional — Docker provides one)

## Quick Start — Docker

```bash
cp .env.example .env
docker-compose -f infra/docker/docker-compose.yml up --build -d
```

See [deployment/setup.md](../deployment/setup.md) for detailed Docker guide.

## Service-by-Service (Local Dev)

### Backend (Express 5, port 3000)

Requires MySQL running (Docker or local).

```bash
cd services/backend
npm install
npm run migrate    # Creates schema + tables
npm run dev        # nodemon — reloads on changes
```

### Frontend (Vue 3 + Vite, port 5173)

```bash
cd services/frontend
npm install
npm run dev        # vite dev server
```

### Admin Panel (Vue 3 + Vite + Pinia, port 5174)

```bash
cd services/admin-panel
npm install
npm run dev        # vite dev server (--host 0.0.0.0)
```

### Blockchain Node (Express + LevelDB, port 3001)

4 nodes expected for peer consensus (ports 3001–3004).

```bash
cd services/blockchain-node
npm install
npm start          # node index.js
```

### Institution API (Express 4 + MySQL, port 4000)

Mock directory service for voter registration.

```bash
cd services/institution-api
npm install
npm start          # node src/server.js
```

## Environment Variables

Copy `.env.example` to `.env` and adjust:

- `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` — MySQL connection
- `JWT_SECRET` — signing key for auth tokens
- `FRONTEND_URL` — CORS origin (default `http://localhost:5173`)
- `VITE_API_BASE_URL` — frontend API target (default `http://localhost:3000/api`)

## Testing

Integration tests require the Docker stack running:

```bash
bash tests/run-tests.sh           # Interactive menu
bash tests/run-tests.sh all       # Full suite
bash tests/categories/smoke-test.sh  # Quick smoke test
```
