# System Architecture Overview

## Service Topology

```text
frontend ──┬── backend ──┬── mysql
(5173)     │             ├── blockchain-node:3001
           │             └── institution-api:4000
           │
admin-panel
(5174)
```

5 Docker services on `voting-network` bridge:

| Service                | Port      | Stack                | Role               |
| ---------------------- | --------- | -------------------- | ------------------ |
| `frontend`             | 5173      | Vue 3 + Vite + Vuex  | Voter UI           |
| `admin-panel`          | 5174      | Vue 3 + Vite + Pinia | Admin UI           |
| `backend`              | 3000      | Express 5 + MySQL    | REST API           |
| `blockchain-node` (x4) | 3001-3004 | Express + LevelDB    | Consensus & ledger |
| `institution-api`      | 4000      | Express 4 + MySQL    | Mock directory API |

## Dependencies

`backend` waits for healthchecks on `mysql`, `blockchain-node`, and `institution-api` before starting. Runs migrations on boot via `npm run migrate && npm start`.

`frontend` and `admin-panel` depend on `backend` (no healthcheck wait — soft dependency).

Blockchain nodes discover each other via `PEERS` env var (comma-separated HTTP URLs). Connections stagger by 2s per peer.

## Health Check Flow

| Service         | Probe                  | Interval | Notes                                               |
| --------------- | ---------------------- | -------- | --------------------------------------------------- |
| mysql           | `mysqladmin ping`      | 10s      |                                                     |
| backend         | `wget /health`         | 15s      |                                                     |
| blockchain-node | `wget /node`           | 15s      | Dockerfile default is 30s, compose overrides to 15s |
| institution-api | `wget /api/health`     | 15s      |                                                     |
| frontend        | none (Vite dev server) | —        |                                                     |

## CORS

Backend reads `CORS_ALLOWED_ORIGINS` env var (comma-separated). Fallback dev defaults:

- `http://localhost:5173` (frontend)
- `http://127.0.0.1:5173`
- `http://localhost:5174` (admin-panel)
- `http://127.0.0.1:5174`

Requests with no `Origin` header (Postman, curl, server-to-server) are permitted — suitable for dev only.

## Environment Variables

- `VITE_API_BASE_URL` — API endpoint for frontend (`http://localhost:3000`)
- `VITE_BLOCKCHAIN_URL` — Blockchain node URL (`http://localhost:3001`)
- `VITE_INSTITUTION_API_URL` — Institution API URL (`http://localhost:4000`)
- `BLOCKCHAIN_NODE_URL` — Backend uses this to submit votes to blockchain
- `JWT_SECRET` — JWT signing secret
- `NULLIFIER_SECRET` — Separate secret for server-side nullifier derivation (required, backend exits if missing)
- `CORS_ALLOWED_ORIGINS` — Comma-separated CORS origins (fallback to dev defaults)

## Authentication Flow

Registration requires email verification before account creation:

1. `POST /api/users/institution-lookup/:institutionId` — verify member exists in institutional directory (proxied to institution-api)
2. `POST /api/users/send-otp` — 6-digit OTP sent to institutional email via `EmailService` (SMTP or Ethereal in dev)
3. `POST /api/users/verify-otp` — constant-time OTP comparison via `OTPService`, marks email verified (10min expiry, 3 attempts max, 60s cooldown between sends)
4. `POST /api/users/register` — creates account, requires client-side ECDSA + RSA-OAEP keypairs. User auto-registered for all active/pending elections
5. `POST /api/users/login` — sets JWT as httpOnly cookie (not localStorage). CSRF double-submit cookie protection. JWT pinned to HS256 with JTI for revocation support

OTP service uses in-memory storage with automatic cleanup. No OTP data persisted to database.

## Route Organization

Election routes are split into four files under `routes/elections/`:

| File            | Responsibility                                       |
| --------------- | ---------------------------------------------------- |
| `crud.js`       | Create, update, delete elections, status transitions |
| `candidates.js` | Add/remove candidates                                |
| `voting.js`     | Vote casting, registration, double-vote prevention   |
| `results.js`    | Admin audit logs, security logs, result release      |

All mounted under `/api/elections`. Election status follows a state machine: `pending → active → completed`.

### Email Routing

Emails are routed based on recipient domain:

| Domain                                                             | Transporter     | Use case                                          |
| ------------------------------------------------------------------ | --------------- | ------------------------------------------------- |
| `university.edu`, `faculty.university.edu`, `staff.university.edu` | Ethereal (test) | Institutional emails — viewable at ethereal.email |
| All other domains                                                  | Real SMTP       | Personal emails — delivered to inbox              |

## Election Locking

`PATCH /api/elections/:id/lock` sets `is_locked=true` on an election and all its candidates. Once locked:

- Candidate add/delete returns 403
- Election update returns 403
- Status changes still allowed
- Voting continues normally

Intended for freezing election configuration before or during voting.

## Auto-Release Results

Backend runs a 60-second scheduler (`setInterval`) that automatically transitions ended elections:

- Checks every 60s for elections with `status = 'active'` AND `end_date < NOW()` AND `results_released = FALSE`
- Sets `results_released = TRUE` and `results_released_at = NOW()`
- Allows public access to vote tallies without manual admin action

## Auto-Registration

Two automatic registration paths exist:

- **New election created** — all existing verified users are automatically registered for the new election (bulk insert into `voter_registrations`)
- **New user registered** — the user is automatically registered for all active and pending elections at registration time

Both paths use `POST /api/elections/:id/register` internally, returning `electionsRegistered` count in the registration response.

## Further Reading

- [Deployment](../deployment/docker.md) — multi-node and production compose files
- [API docs](../api/backend.md) — backend REST endpoints
- [Database schema](../database/schema.md) — MySQL table structure
- **New to blockchain voting?** See the [Knowledge Base](../knowledge/blockchain.md) for academic explainers of blockchain, cryptography, security, and e-voting concepts
