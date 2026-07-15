# Environment Variables

## Root `.env`

Source of truth: `.env.example` in project root. Copy to `.env` before starting.

### Node

| Variable   | Default       | Description  |
| ---------- | ------------- | ------------ |
| `NODE_ENV` | `development` | Runtime mode |

### Backend (port 3000)

| Variable              | Default                                                           | Description          |
| --------------------- | ----------------------------------------------------------------- | -------------------- |
| `PORT`                | `3000`                                                            | Backend listen port  |
| `JWT_SECRET`          | `your-super-secret-jwt-key-change-in-production-minimum-32-chars` | JWT signing key      |
| `FRONTEND_URL`        | `http://localhost:5173`                                           | CORS allowed origin  |
| `INSTITUTION_API_URL` | `http://institution-api:4000`                                     | Institution API host |

### MySQL

Two sets — `DB_*` for application use, `MYSQL_*` for Docker image.

| Variable              | Default            | Description                        |
| --------------------- | ------------------ | ---------------------------------- |
| `DB_HOST`             | `localhost`        | MySQL host (use `mysql` in Docker) |
| `DB_PORT`             | `3306`             | MySQL port                         |
| `DB_USER`             | `voting_user`      | Application DB user                |
| `DB_PASSWORD`         | `voting_pass`      | Application DB password            |
| `DB_NAME`             | `voting_db`        | Application DB name                |
| `DB_ROOT_PASSWORD`    | `voting_root_pass` | MySQL root password                |
| `MYSQL_ROOT_PASSWORD` | `voting_root_pass` | Docker MySQL root password         |
| `MYSQL_DATABASE`      | `voting_db`        | Docker MySQL database              |
| `MYSQL_USER`          | `voting_user`      | Docker MySQL user                  |
| `MYSQL_PASSWORD`      | `voting_pass`      | Docker MySQL password              |

### Frontend (port 5173)

These are baked at build time for production (Dockerfile.prod uses `ARG`).

| Variable                   | Default                     | Description         |
| -------------------------- | --------------------------- | ------------------- |
| `VITE_API_BASE_URL`        | `http://localhost:3000/api` | Backend API URL     |
| `VITE_BLOCKCHAIN_URL`      | `http://localhost:3001`     | Blockchain node URL |
| `VITE_INSTITUTION_API_URL` | `http://localhost:4000`     | Institution API URL |

### Blockchain Node (port 3001)

| Variable              | Default                       | Description               |
| --------------------- | ----------------------------- | ------------------------- |
| `BLOCKCHAIN_NODE_URL` | `http://blockchain-node:3001` | Internal node URL         |
| `NODE_ID`             | `node1`                       | Node identifier           |
| `NODE_TYPE`           | `validator`                   | `validator` or `observer` |
| `PEERS`               | _(empty)_                     | Comma-separated peer URLs |

### SMTP (Optional)

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

`docker-compose.prod.yml` has **no default values**. These variables must be set in `.env`:

- `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- `JWT_SECRET`
- `FRONTEND_URL`
- `VITE_API_BASE_URL`, `VITE_BLOCKCHAIN_URL`

## Test Stack

`docker-compose.test.yml` uses `voting_test_*` defaults for DB credentials and separate DB name (`voting_test_db`, `institution_test_db`). Backend test JWT secret: `test-jwt-secret-for-integration-tests`.
