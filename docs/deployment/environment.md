# Environment Variables

## Root `.env`

Source of truth: `.env.example` in project root. Copy to `.env` before starting.

### Node

| Variable   | Default       | Description  |
| ---------- | ------------- | ------------ |
| `NODE_ENV` | `development` | Runtime mode |

### Service Ports

Every port is configurable via `.env`. Defaults shown below:

| Variable                | Default | Description                         |
| ----------------------- | ------- | ----------------------------------- |
| `BACKEND_PORT`          | `3000`  | Backend listen port                 |
| `FRONTEND_PORT`         | `5173`  | Frontend dev server port            |
| `ADMIN_PANEL_PORT`      | `5174`  | Admin panel port                    |
| `INSTITUTION_PORT`      | `4000`  | Institution API port                |
| `BLOCKCHAIN_NODE1_PORT` | `3001`  | Primary blockchain node             |
| `BLOCKCHAIN_NODE2_PORT` | `3002`  | Blockchain node 2                   |
| `BLOCKCHAIN_NODE3_PORT` | `3003`  | Blockchain node 3                   |
| `BLOCKCHAIN_NODE4_PORT` | `3004`  | Blockchain node 4                   |
| `BLOCKCHAIN_NODE5_PORT` | `3005`  | Blockchain node 5 (multi-node only) |
| `PMA_HOST_PORT`         | `8080`  | phpMyAdmin host port                |

### Monitoring Ports

| Variable             | Default | Description   |
| -------------------- | ------- | ------------- |
| `PROMETHEUS_PORT`    | `9090`  | Prometheus UI |
| `GRAFANA_PORT`       | `3030`  | Grafana UI    |
| `CADVISOR_PORT`      | `8081`  | cAdvisor UI   |
| `NODE_EXPORTER_PORT` | `9100`  | Node exporter |
| `LOKI_PORT`          | `3100`  | Loki HTTP API |

### Node Environment

| Variable   | Default       | Description  |
| ---------- | ------------- | ------------ |
| `NODE_ENV` | `development` | Runtime mode |

### Backend (port ${BACKEND_PORT})

| Variable              | Default                                          | Description          |
| --------------------- | ------------------------------------------------ | -------------------- |
| `JWT_SECRET`          | `change-me-to-a-random-secret-at-least-32-chars` | JWT signing key      |
| `FRONTEND_URL`        | `http://localhost:5173`                          | CORS allowed origin  |
| `INSTITUTION_API_URL` | `http://institution-api:4000`                    | Institution API host |
| `BACKEND_URL`         | `http://backend:3000`                            | Internal backend URL |

### MySQL

Two sets — `DB_*` for application use, `MYSQL_*` for Docker image.

| Variable              | Default          | Description                                 |
| --------------------- | ---------------- | ------------------------------------------- |
| `DB_HOST`             | `mysql`          | MySQL host (use `localhost` outside Docker) |
| `DB_PORT`             | `3306`           | MySQL port                                  |
| `DB_USER`             | `voting_user`    | Application DB user                         |
| `DB_PASSWORD`         | `change-me`      | Application DB password                     |
| `DB_NAME`             | `voting_db`      | Application DB name                         |
| `DB_ROOT_PASSWORD`    | `change-me`      | MySQL root password                         |
| `MYSQL_ROOT_PASSWORD` | `change-me`      | Docker MySQL root password                  |
| `MYSQL_DATABASE`      | `voting_db`      | Docker MySQL database                       |
| `MYSQL_USER`          | `voting_user`    | Docker MySQL user                           |
| `MYSQL_PASSWORD`      | `change-me`      | Docker MySQL password                       |
| `INSTITUTION_DB_NAME` | `institution_db` | Institution API schema                      |

### Frontend (port ${FRONTEND_PORT})

These are baked at build time for production (Dockerfile.prod uses `ARG`).

| Variable                   | Default                 | Description         |
| -------------------------- | ----------------------- | ------------------- |
| `VITE_API_BASE_URL`        | `http://localhost:3000` | Backend API URL     |
| `VITE_BLOCKCHAIN_URL`      | `http://localhost:3001` | Blockchain node URL |
| `VITE_INSTITUTION_API_URL` | `http://localhost:4000` | Institution API URL |

### Blockchain Node (port ${BLOCKCHAIN_NODE1_PORT})

| Variable              | Default                       | Description                                  |
| --------------------- | ----------------------------- | -------------------------------------------- |
| `BLOCKCHAIN_NODE_URL` | `http://blockchain-node:3001` | Internal node URL                            |
| `BLOCKCHAIN_API_KEY`  | _(required)_                  | API key for node access (`x-api-key` header) |
| `BACKEND_URL`         | `http://backend:3000`         | Backend URL for CORS restriction             |
| `NODE_ID`             | `node1`                       | Node identifier                              |
| `NODE_TYPE`           | `validator`                   | `validator` or `observer`                    |
| `PEERS`               | _(empty)_                     | Comma-separated peer URLs                    |

### Institution API (port ${INSTITUTION_PORT})

| Variable              | Default               | Description                                             |
| --------------------- | --------------------- | ------------------------------------------------------- |
| `INSTITUTION_API_KEY` | _(required)_          | API key for institution-api access (`x-api-key` header) |
| `BACKEND_URL`         | `http://backend:3000` | Backend URL for CORS restriction                        |

### SMTP (Optional)

Configured SMTP is used for **real email addresses** (non-institutional). Institutional emails (`university.edu` family) always use Ethereal (test) regardless of SMTP config.

| Variable          | Default                    | Description      |
| ----------------- | -------------------------- | ---------------- |
| `SMTP_HOST`       | _(empty)_                  | SMTP server host |
| `SMTP_PORT`       | `587`                      | SMTP server port |
| `SMTP_SECURE`     | `false`                    | Use TLS          |
| `SMTP_USER`       | _(empty)_                  | SMTP username    |
| `SMTP_PASS`       | _(empty)_                  | SMTP password    |
| `SMTP_FROM_NAME`  | `University Voting System` | Sender name      |
| `SMTP_FROM_EMAIL` | `noreply@university.edu`   | Sender email     |

---

## Backend `.env` (`services/backend/.env.example`)

Extends root `.env` with backend-specific variables. Used for local (non-Docker) development.

| Variable                  | Default                                                        | Description                |
| ------------------------- | -------------------------------------------------------------- | -------------------------- |
| `SESSION_SECRET`          | `change_this_session_secret_in_production`                     | Express session secret     |
| `MFA_ISSUER`              | `University Voting System`                                     | MFA issuer label           |
| `ENCRYPTION_KEY`          | `32_byte_hex_key_for_encrypting_sensitive_data_change_in_prod` | AES encryption key         |
| `ENCRYPTION_IV`           | `16_byte_hex_initialization_vector_change_in_production`       | AES initialization vector  |
| `CORS_ORIGIN`             | `http://localhost:5173`                                        | CORS allowed origin        |
| `RATE_LIMIT_WINDOW_MS`    | `900000`                                                       | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100`                                                          | Max requests per window    |
| `LOG_LEVEL`               | `info`                                                         | Log level                  |
| `LOG_FILE`                | `./logs/app.log`                                               | Log file path              |

### Future / Production-Only

These are commented out in `.env.example`:

| Variable            | Description             |
| ------------------- | ----------------------- |
| `IDP_URL`           | Identity provider URL   |
| `IDP_CLIENT_ID`     | IdP client ID           |
| `IDP_CLIENT_SECRET` | IdP client secret       |
| `VAULT_ADDR`        | HashiCorp Vault address |
| `VAULT_TOKEN`       | Vault auth token        |
| `HSM_SLOT`          | HSM slot number         |
| `HSM_PIN`           | HSM PIN                 |

---

## Production Requirements

`docker-compose.prod.yml` has **no default values** (all `:?` required). These variables must be set in `.env`:

- All service ports (`BACKEND_PORT`, `FRONTEND_PORT`, `BLOCKCHAIN_NODE1_PORT`, `INSTITUTION_PORT`, etc.)
- `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- `DB_HOST`, `DB_PORT`
- `JWT_SECRET`
- `FRONTEND_URL`, `ADMIN_PANEL_URL`, `INSTITUTION_API_URL`
- `VITE_API_BASE_URL`, `VITE_BLOCKCHAIN_URL`
- `BLOCKCHAIN_API_KEY`
- `INSTITUTION_API_KEY`
- `CORS_ALLOWED_ORIGINS`
- `INSTITUTION_DB_NAME`

## Test Stack

`docker-compose.test.yml` is self-contained with `TEST_*` prefixed defaults:

- `TEST_MYSQL_ROOT_PASSWORD=voting_test_root_pass`
- `TEST_MYSQL_DATABASE=voting_test_db`
- `TEST_BACKEND_PORT=3005`, `TEST_FRONTEND_PORT=5175`, `TEST_INSTITUTION_PORT=4005`
- `TEST_BLOCKCHAIN_NODE1_PORT=3010` (through `_NODE4_PORT` at 3013)
- `TEST_JWT_SECRET=test-jwt-secret-for-integration-tests`
- `TEST_PMA_PORT=8081`, `TEST_ADMIN_PANEL_PORT=5176`

Run test stack without `.env`: `docker-compose -f infra/docker/docker-compose.test.yml up -d`
