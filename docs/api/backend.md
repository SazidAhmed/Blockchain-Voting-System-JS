# Backend API

Express 5 · Port 3000 · MySQL 8.0

## Base URL

```text
http://localhost:3000
```

## Auth

JWT-based with HS256 only (algorithm restricted to prevent algorithm confusion attacks). Token set as httpOnly cookie only — never returned in response body. Two middleware layers:

- `auth` — any authenticated user (middleware/auth.js:5)
- `adminAuth` — admin or board_member role only (middleware/auth.js:35)

### CSRF Protection

Double-submit cookie pattern. Server sets `csrf-token` cookie; client sends it back as `x-csrf-token` header on state-changing requests. Server validates both tokens match. Public auth endpoints (`/login`, `/register`, `/verify-otp`, etc.) are CSRF-exempt.

### Token Revocation

Tokens include a `jti` (JWT ID) claim. Revoked tokens are added to an in-memory blacklist. Logout and password change invalidate the current token.

### Logout

`POST /api/users/auth/logout` — invalidates the current JWT and clears the auth cookie.

### Password Change

`POST /api/users/change-password` — requires current password verification. Invalidates all existing tokens for the user.

## Rate Limiting

| Limiter           | Window | Max | Applied To                            |
| ----------------- | ------ | --- | ------------------------------------- |
| `registerLimiter` | 15m    | 5   | POST /api/users/register              |
| `loginLimiter`    | 15m    | 10  | POST /api/users/login                 |
| `otpLimiter`      | 15m    | 5   | POST /api/users/send-otp, /verify-otp |
| `voteLimiter`     | 1h     | 10  | POST /api/elections/:id/vote          |
| `generalLimiter`  | 15m    | 100 | All other endpoints                   |

All return `429 Too Many Requests` with `RateLimit-*` headers.

**Body parser limit:** 1mb max payload. **Trust proxy:** enabled (1 level) for accurate client IP behind reverse proxy. **404 handler:** returns `{ "error": "Not Found", "message": "<method> <path> does not exist", "status": 404 }` without exposing available routes.

## CORS

Origins from `CORS_ALLOWED_ORIGINS` env var (comma-separated), or fallback to `localhost:5173`, `localhost:5174`, `127.0.0.1:5173`, `127.0.0.1:5174`. Credentials enabled. Requests with no `Origin` header (curl, server-to-server) allowed for dev.

## Common Headers

```text
Content-Type: application/json
csrf-token cookie → x-csrf-token header (state-changing requests)
```

## Error Response Shape

```json
{ "message": "error description" }
```

In non-production, a `stack` field is also returned.

---

## Users

### `GET /api/users/institution-lookup/:institutionId`

Look up a member in the institutional directory. Proxies to institution-api `GET /api/lookup/:institutionId`.

**Auth:** none

**Response 200:**

```json
{
  "institutionId": "STU00001",
  "fullName": "John Smith",
  "email": "john.smith1@university.edu",
  "role": "student",
  "department": "Computer Science",
  "year": "1st Year",
  "isVoter": false
}
```

### `POST /api/users/send-otp`

Send OTP to the member's institutional email.

**Auth:** none

**Body:**

```json
{ "institutionId": "STU00001" }
```

**Response 200:**

```json
{
  "message": "Verification code sent to your institutional email.",
  "maskedEmail": "j***@university.edu",
  "expiresInMinutes": 10
}
```

### `POST /api/users/verify-otp`

Verify the OTP code. Required before registration.

**Auth:** none

**Body:**

```json
{ "institutionId": "STU00001", "code": "123456" }
```

**Response 200:**

```json
{ "message": "OTP verified successfully", "verified": true }
```

### `POST /api/users/register`

Register a new voter. Requires a previously verified OTP. Client-side key generation required — server does not generate keys. Auto-registers user for all active/pending elections.

**Auth:** none

**Rate limit:** registerLimiter (5/15m)

**Body:**

```json
{
  "institutionId": "STU00001",
  "password": "strongPassword123",
  "publicKey": "ecdsa-p256-public-key-base64",
  "encryptionPublicKey": "rsa-oaep-public-key-base64"
}
```

**Response 201:**

```json
{
  "user": {
    "id": 1,
    "institutionId": "STU00001",
    "username": "John Smith",
    "role": "student",
    "email": "john.smith1@university.edu",
    "publicKey": "...",
    "encryptionPublicKey": "..."
  },
  "electionsRegistered": 2
}
```

### `POST /api/users/login`

Authenticate. JWT set as httpOnly cookie.

**Auth:** none

**Rate limit:** loginLimiter (10/15m)

**Body:**

```json
{
  "institutionId": "STU00001",
  "password": "strongPassword123",
  "loginType": "voter"
}
```

| Field           | Type   | Required | Description                                                                             |
| --------------- | ------ | -------- | --------------------------------------------------------------------------------------- |
| `institutionId` | string | yes      | Institution ID                                                                          |
| `password`      | string | yes      | Account password                                                                        |
| `loginType`     | string | no       | `"voter"` or `"admin"` — filters by role. Omit for any-role login (backward compatible) |

**Error responses:**

| Status | Condition                                               |
| ------ | ------------------------------------------------------- |
| 400    | Invalid credentials (generic, no distinction)           |
| 400    | `loginType: "voter"` but user is admin/board_member     |
| 400    | `loginType: "admin"` but user is not admin/board_member |

**Response 200:** Sets `token` httpOnly cookie. Body includes `user` only (token never exposed to client-side JS):

```json
{
  "user": {
    "id": 1,
    "institutionId": "STU00001",
    "username": "John Smith",
    "role": "student",
    "email": "...",
    "publicKey": "...",
    "encryptionPublicKey": "..."
  }
}
```

### `GET /api/users/me`

Get the current authenticated user's profile.

**Auth:** required

**Response 200:**

```json
{
  "id": 1,
  "institutionId": "STU00001",
  "username": "John Smith",
  "role": "student",
  "email": "john.smith1@university.edu",
  "publicKey": "...",
  "encryptionPublicKey": "...",
  "createdAt": "2026-07-15T12:00:00.000Z"
}
```

---

## Elections

Election routes are split into four files under `routes/elections/`: `crud.js` (create/update/delete, status transitions), `candidates.js` (candidate management), `voting.js` (vote casting, registration, double-vote prevention), `results.js` (admin audit logs, security logs, result release). All routes are mounted under `/api/elections`.

Election status follows a state machine: `pending → active → completed`. Status transitions are enforced — invalid transitions return 400.

### `GET /api/elections`

List all elections, ordered by created_at descending.

**Auth:** none

**Response 200:** Array of `{ id, title, description, start_date, end_date, status, created_at }`

### `GET /api/elections/:id`

Get a single election with candidates and vote tally. Results are encrypted until released.

**Auth:** none

**Response 200 (results not released):**

```json
{
  "id": 1,
  "title": "Student Union President",
  "description": "...",
  "start_date": "2026-08-01T00:00:00.000Z",
  "end_date": "2026-08-02T00:00:00.000Z",
  "status": "active",
  "public_key": "...",
  "created_at": "2026-07-15T12:00:00.000Z",
  "candidates": [
    { "id": 1, "name": "Alice", "description": "...", "votes_count": null }
  ],
  "totalVotes": null,
  "encryptedTally": "base64-aes-256-gcm-ciphertext",
  "resultsReleased": false
}
```

**Response 200 (results released):**

```json
{
  "id": 1,
  "title": "Student Union President",
  "candidates": [
    { "id": 1, "name": "Alice", "description": "...", "votes_count": 42 }
  ],
  "totalVotes": 100,
  "resultsReleased": true
}
```

### `POST /api/elections`

Create an election. Auto-registers all existing verified users.

**Auth:** adminAuth

**Body:**

```json
{
  "title": "Student Union President",
  "description": "Vote for your next president",
  "startDate": "2026-08-01T00:00:00Z",
  "endDate": "2026-08-02T00:00:00Z",
  "candidates": [
    { "name": "Alice", "description": "Platform A" },
    { "name": "Bob", "description": "Platform B" }
  ]
}
```

**Response 201:**

```json
{
  "message": "Election created successfully",
  "electionId": 1,
  "title": "...",
  "startDate": "...",
  "endDate": "...",
  "publicKey": "..."
}
```

### `PUT /api/elections/:id`

Update election details. Cannot modify an active or already-started election.

**Auth:** adminAuth

**Body:** `{ "title", "description", "startDate", "endDate", "candidates" }`

### `PATCH /api/elections/:id/status`

Update election status. Valid transitions: `pending → active`, `active → completed`. `completed` has no further transitions.

**Auth:** adminAuth

**Body:** `{ "status": "active"|"completed" }`

### `PATCH /api/elections/:id/lock`

Lock an election to prevent further mutations. Sets `is_locked=true` on election and all candidates. Returns 403 if already locked.

**Auth:** adminAuth

**Response 200:**

```json
{ "message": "Election locked successfully" }
```

**Response 403:** `{ "message": "Election is already locked" }`

### `DELETE /api/elections/:id`

Delete an election and all related data. Cannot delete an active election that has started.

**Auth:** adminAuth

### `POST /api/elections/:id/release`

Release election results — makes plaintext vote tallies publicly visible. Once released, the `encryptedTally` field is replaced with actual `votes_count` values. Cannot release results that are already released.

**Auth:** adminAuth

**Response 200:**

```json
{
  "message": "Results released successfully",
  "resultsReleased": true
}
```

**Response 400:** `{ "message": "Results already released" }`

**Response 404:** `{ "message": "Election not found" }`

### `POST /api/elections/:id/register`

Register the authenticated user for an election.

**Auth:** required

**Response 201:**

```json
{
  "message": "Successfully registered for election",
  "electionId": 1,
  "registrationToken": "..."
}
```

### `GET /api/elections/:id/registration-status`

Check if current user is registered for an election.

**Auth:** required

**Response 200:** `{ "registered": true, "status": "registered"|"voted"|null }`

### `POST /api/elections/:id/candidates`

Add a candidate to an election. Fails if election is locked or active.

**Auth:** adminAuth

**Body:** `{ "name": "Candidate Name", "description": "..." }`

### `DELETE /api/elections/:electionId/candidates/:candidateId`

Remove a candidate. Fails if election is locked or active.

**Auth:** adminAuth

---

## Voting

### `POST /api/elections/:id/vote`

Cast a vote. Client encrypts ballot, derives nullifier, signs the vote, and provides the ECDSA public key — all cryptography is handled client-side to protect user privacy.

**Auth:** required

**Rate limit:** voteLimiter (10/h)

**Request payload:**

```json
{
  "encryptedBallot": "base64-encrypted-ballot",
  "nullifier": "sha256-hex-nullifier",
  "signature": "ecdsa-signature-base64",
  "publicKey": "ecdsa-public-key-base64",
  "timestamp": 1720000000000,
  "electionId": "1"
}
```

**Response 200:**

```json
{
  "message": "Vote cast successfully",
  "receipt": {
    "receiptId": "opaque-receipt-id-hex",
    "transactionHash": "sha256-tx-hash",
    "blockIndex": 0,
    "timestamp": "2026-07-15T12:00:00.000Z"
  }
}
```

### Vote Lifecycle

1. `POST /api/users/institution-lookup/:id` — verify member exists
2. `POST /api/users/send-otp` — get OTP email
3. `POST /api/users/verify-otp` — confirm OTP
4. `POST /api/users/register` — create account (keys generated client-side)
5. `POST /api/users/login` — authenticate, receive JWT
6. `GET /api/elections` — list active elections
7. `POST /api/elections/:id/vote` — cast encrypted ballot
8. Vote submitted to blockchain node `POST /vote`, mined into block
9. Receipt returned with transaction hash for verification

---

## Admin / Audit

All admin endpoints pass through audit logging middleware that records admin actions (who, what, when) for compliance.

### `GET /api/elections/admin/all`

Get all elections with statistics (candidates count, registrations, votes, per-candidate tallies). Results are encrypted per-election based on `results_released` status — each election includes `encryptedTally` (base64 AES-256-GCM) or plaintext `votes_count` accordingly.

**Auth:** adminAuth

### `GET /api/elections/admin/audit-logs`

**Auth:** adminAuth

**Query:** `?adminId=&limit=100&offset=0`

### `GET /api/elections/admin/security-logs`

**Auth:** adminAuth

**Query:** `?limit=100&offset=0`

### `POST /api/elections/admin/verify-audit-integrity/:logId`

**Auth:** adminAuth

**Response:** `{ "valid": true, "logId": 1 }`

---

## Health

### `GET /health`

**Auth:** none

**Response 200:** `{ "status": "ok", "message": "Server is running" }`
