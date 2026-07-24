# Docker Deployment

## Compose Files

All files in `infra/docker/`:

| File                            | Purpose                             |
| ------------------------------- | ----------------------------------- |
| `docker-compose.yml`            | Main dev stack                      |
| `docker-compose.test.yml`       | Isolated test stack                 |
| `docker-compose.monitoring.yml` | Prometheus/Grafana/Loki             |
| `docker-compose.multi-node.yml` | 5-node blockchain cluster           |
| `docker-compose.prod.yml`       | Production with Nginx reverse proxy |

---

## Main Stack (`docker-compose.yml`)

### Services

| Service           | Container                | Build Context                             | Default Port |
| ----------------- | ------------------------ | ----------------------------------------- | ------------ |
| mysql             | voting-mysql             | mysql:8.0 (image)                         | 3306         |
| phpmyadmin        | voting-phpmyadmin        | phpmyadmin:5.2 (image)                    | 8080 (host)  |
| blockchain-node   | voting-blockchain        | context: `../../services/blockchain-node` | 3001         |
| blockchain-node-2 | voting-blockchain-node-2 | same                                      | 3002         |
| blockchain-node-3 | voting-blockchain-node-3 | same                                      | 3003         |
| blockchain-node-4 | voting-blockchain-node-4 | same                                      | 3004         |
| backend           | voting-backend           | context: `../../services/backend`         | 3000         |
| frontend          | voting-frontend          | context: `../../services/frontend`        | 5173         |
| admin-panel       | voting-admin-panel       | context: `../../services/admin-panel`     | 5174         |
| institution-api   | voting-institution-api   | context: `../../services/institution-api` | 4000         |

> All ports above are defaults — override via `BACKEND_PORT`, `FRONTEND_PORT`, `BLOCKCHAIN_NODE1_PORT`, etc. in `.env`. See [environment.md](environment.md) for the full list.

### Networks

- `voting-network` — bridge, all services connected

### Volumes

- `mysql_data` — MySQL persistence
- `blockchain_data`, `blockchain_data_2`, `blockchain_data_3`, `blockchain_data_4` — LevelDB per node

### Health Checks

| Service         | Endpoint             | Interval | Retries |
| --------------- | -------------------- | -------- | ------- |
| mysql           | `mysqladmin ping`    | 10s      | 10      |
| blockchain-node | `GET /node`          | 15s      | 5       |
| backend         | `GET /api/elections` | 15s      | 5       |
| institution-api | `GET /api/health`    | 15s      | 5       |

### Startup Order

```text
mysql (healthy) → phpmyadmin
mysql (healthy) → institution-api (healthy)
mysql (healthy) + blockchain-node (healthy) + institution-api (healthy) → backend (healthy)
backend → frontend, admin-panel
```

### Environment Variables (per service)

**mysql**: `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` — all from `.env` with defaults.

**blockchain-node**: `NODE_ID=node1`, `PORT=3001`, `PEERS` (URLs of other 3 nodes), `NODE_ENV`.

**backend**: `DB_HOST=mysql`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `BLOCKCHAIN_NODE_URL`, `FRONTEND_URL`, `INSTITUTION_API_URL`.

**frontend**: `VITE_API_BASE_URL`, `VITE_BLOCKCHAIN_URL`, `VITE_INSTITUTION_API_URL`.

**admin-panel**: `VITE_API_BASE_URL`.

**institution-api**: `DB_HOST=mysql`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=institution_db`, `FRONTEND_URL`, `ADMIN_PANEL_URL`, `INSTITUTION_API_KEY`.

---

## Test Stack (`docker-compose.test.yml`)

Isolated stack with `voting-test-*` naming. All ports shifted to avoid conflict:

| Service         | Port      |
| --------------- | --------- |
| mysql           | 3307      |
| phpmyadmin      | 8081      |
| blockchain-node | 3010-3013 |
| backend         | 3005      |
| frontend        | 5175      |
| admin-panel     | 5176      |
| institution-api | 4005      |

Network: `voting-test-network`. Volumes: `mysql_test_data`, `blockchain_test_data*`.

---

## Monitoring Stack (`docker-compose.monitoring.yml`)

Extends main stack. Includes:

| Service        | Port | Purpose                  |
| -------------- | ---- | ------------------------ |
| prometheus     | 9090 | Metrics collection       |
| grafana        | 3030 | Dashboards (admin/admin) |
| cadvisor       | 8081 | Container metrics        |
| node-exporter  | 9100 | Host metrics             |
| mysql-exporter | 9104 | DB metrics               |
| loki           | 3100 | Log aggregation          |
| promtail       | —    | Log shipper              |

```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml --env-file .env up -d
```

Networks: `monitoring` (new bridge) + `voting-network` (external). Volumes: `prometheus_data`, `grafana_data`, `loki_data`.

---

## Multi-Node Stack (`docker-compose.multi-node.yml`)

5 blockchain nodes with shared MySQL:

All ports below are defaults — override via `BLOCKCHAIN_NODE1_PORT`–`BLOCKCHAIN_NODE5_PORT` in `.env`.

| Node              | Default Port | Type      |
| ----------------- | ------------ | --------- |
| blockchain-node-1 | 3001         | validator |
| blockchain-node-2 | 3002         | validator |
| blockchain-node-3 | 3003         | validator |
| blockchain-node-4 | 3004         | observer  |
| blockchain-node-5 | 3005         | observer  |

Includes MySQL (`voting-mysql-multinode`, port 3306) with its own volume. Network: `voting-blockchain-network`. No frontend/backend — blockchain only.

---

## Production Stack (`docker-compose.prod.yml`)

Hardened for production. Key differences from main:

- **No default env values** — all vars required (no `:-` fallbacks)
- **No exposed ports** except Nginx (80, 443)
- **No bind mounts** — only `keys` volume (read-only)
- **Frontend uses** `Dockerfile.prod` (static build, not dev server)
- **Nginx reverse proxy** with SSL termination

```nginx
# infra/docker/nginx/nginx.conf
events { worker_connections 1024; }
http {
  server {
    listen 80;
    location / { proxy_pass http://frontend:5173; }
    location /api/ { proxy_pass http://backend:3000; }
  }
}
```

Nginx expects SSL certs in `./nginx/ssl/` and logs in `./nginx/logs/`.

---

## Commands

All commands below require `--env-file` (compose interpolates `.env` vars from the compose file's directory otherwise):

```bash
# Start (first time builds images)
docker-compose -f infra/docker/docker-compose.yml --env-file .env up --build -d

# Stop and remove containers
docker-compose -f infra/docker/docker-compose.yml --env-file .env down

# Stop and destroy volumes (DELETES DATA)
docker-compose -f infra/docker/docker-compose.yml --env-file .env down -v

# View logs (all)
docker-compose -f infra/docker/docker-compose.yml --env-file .env logs -f

# View logs (single service)
docker-compose -f infra/docker/docker-compose.yml --env-file .env logs -f backend

# Rebuild single service
docker-compose -f infra/docker/docker-compose.yml --env-file .env up --build backend

# Rebuild without cache
docker-compose -f infra/docker/docker-compose.yml --env-file .env build --no-cache backend

# Execute command in container (uses container env, --env-file optional)
docker-compose -f infra/docker/docker-compose.yml exec backend sh

# Run migrations manually
docker-compose -f infra/docker/docker-compose.yml exec backend npm run migrate
```
