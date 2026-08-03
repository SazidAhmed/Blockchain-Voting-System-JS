# Security Concepts

An academic overview of security principles applied in this blockchain voting system.

---

## Defense in Depth

This system applies **layered security** — no single control is trusted to prevent all attacks. Each layer raises the cost of exploitation:

```text
┌─────────────────────────────────────────┐
│            CLIENT SIDE                   │
│  ECDSA signing · RSA encryption · XSS   │
├─────────────────────────────────────────┤
│            TRANSPORT                    │
│  HTTPS · JWT tokens · Rate limiting     │
├─────────────────────────────────────────┤
│            BACKEND API                  │
│  Input validation · Auth middleware      │
├─────────────────────────────────────────┤
│            DATABASE                     │
│  Parameterized queries · Encryption     │
├─────────────────────────────────────────┤
│            BLOCKCHAIN                   │
│  Hash chaining · PoW · Byzantine BFT    │
└─────────────────────────────────────────┘
```

---

## Authentication: JWT with HS256

### How It Works

| Step | What Happens                                                                  |
| ---- | ----------------------------------------------------------------------------- |
| 1    | User logs in with credentials                                                 |
| 2    | Backend verifies credentials, generates JWT (HS256 only)                      |
| 3    | JWT contains user ID, role, expiration, JTI for revocation                    |
| 4    | Client receives JWT as httpOnly cookie (never exposed to JS)                  |
| 5    | Backend middleware verifies JWT signature with explicit algorithm restriction |

**Algorithm confusion prevention (C-01):** JWTs are signed with HMAC-SHA256 (HS256). The `jwt.verify()` call explicitly restricts to `algorithms: ['HS256']` to prevent attackers from switching to RS256 and using the HS256 secret as an RSA public key.

**Token storage (H-01):** Token stored in httpOnly cookie only — never returned in response body. This prevents XSS attacks from stealing the token. Frontend never sees the JWT value; the browser automatically sends it with each request.

**Token revocation:** Includes JTI (JWT ID) claim for revocation via blacklist stored in MySQL (`token_blacklist` table). Blacklisted tokens are rejected even if not yet expired. Expired tokens are periodically cleaned from the blacklist.

### Middleware Layers

```text
auth middleware     → any authenticated user
adminAuth middleware → admin or board_member role only
```

Routes are protected by applying the appropriate middleware. Protected endpoints without middleware are a **critical vulnerability** — the system tests for this explicitly.

### API Key Authentication

Blockchain node and institution API endpoints use API key authentication via `x-api-key` header:

**Blockchain node (C-06, C-07):** All chain data endpoints (`/chain`, `/node`, `/node/status`, `/network/status`) and Merkle verification (`/merkle/verify`) require `BLOCKCHAIN_API_KEY`. Only `/health` is public (used by Docker healthchecks and monitoring).

**Institution API (C-09):** All data-returning endpoints (`/api/lookup/:institutionId`, `/api/members`, `/api/search`) require `INSTITUTION_API_KEY` to prevent PII disclosure. Only `/api/health` and `/voter-picker` are public.

---

## Authorization: Role-Based Access

The system enforces role-based access control (RBAC):

| Role           | Capabilities                                      |
| -------------- | ------------------------------------------------- |
| `voter`        | Cast votes, view elections, manage profile        |
| `admin`        | Create elections, manage candidates, view results |
| `board_member` | Full election lifecycle management                |

Role checks happen at the middleware level — before route handler code executes. This prevents privilege escalation even if a route handler forgets to check roles.

---

## Double-Vote Prevention: Nullifiers

Double voting is the most critical threat to election integrity. The nullifier system prevents it:

```text
voter registers → client generates nullifier → SHA-256(privateKey + "||" + electionId)
                                       ↓
                               backend stores nullifier hash
                                       ↓
                          second vote attempt → nullifier exists → REJECT
```

Properties:

- **Client-supplied (C-05):** Nullifiers are generated client-side only. Server never derives nullifiers from user credentials, preventing nullifier collision attacks.
- **Deterministic**: Same voter + election always produces same nullifier
- **Unique**: Different secret keys → different nullifiers
- **Irreversible**: Cannot extract voter identity from nullifier
- **One-time**: Each nullifier can only be used once per election
- **TOCTOU protection (H-06):** UNIQUE constraint on `votes_meta.nullifier_hash` with transaction isolation and `ER_DUP_ENTRY` handling prevents race conditions.

The backend checks nullifier uniqueness at both database level (UNIQUE constraint) and application level before accepting any vote.

---

## Tamper-Evident Audit Logs

Audit logs protect against both external tampering and insider threats.

### Hash Chaining

Each audit log entry contains the hash of the previous entry:

```text
Entry 3  →  hash(Entry 3 data + hash of Entry 2)
Entry 2  →  hash(Entry 2 data + hash of Entry 1)
Entry 1  →  hash(Entry 1 data + "GENESIS")
```

Modifying any entry breaks the chain from that point forward. This is the same principle behind blockchain — applied to administrative logs.

### What Gets Logged

- Vote submissions (voter ID, election ID, timestamp — no ballot content)
- Election state changes (create, activate, complete)
- Authentication events (login, failed attempts)
- Admin actions (candidate management, election settings)

---

## Input Validation

Every user input is a potential attack vector. The system validates at trust boundaries:

### Sanitization

| Input Type      | Validation                        |
| --------------- | --------------------------------- |
| Usernames       | Alphanumeric only, length limits  |
| Email addresses | Format validation, length limits  |
| OTP codes       | Exact length, numeric only        |
| Election data   | Required fields, type checking    |
| Vote payloads   | Schema validation, field presence |

### SQL Injection Prevention

All database queries use **parameterized statements** (MySQL prepared statements). User input is never interpolated into SQL strings:

```sql
-- Safe: parameterized
SELECT * FROM users WHERE id = ?

-- Unsafe: string interpolation (NOT used)
SELECT * FROM users WHERE id = '${userInput}'
```

### Canonical JSON Serialization (H-03)

All data signed or verified uses **canonical JSON** — object keys sorted alphabetically before stringification. This prevents signature verification failures from key-order differences across platforms:

```text
Without canonicalization:
  Client: JSON.stringify({a: 1, b: 2}) → '{"a":1,"b":2}'
  Server: JSON.stringify({b: 2, a: 1}) → '{"b":2,"a":1}'
  → Same data, different strings → signature verification fails

With canonicalization:
  Both produce: '{"a":1,"b":2}' → signature verified
```

This is critical for cross-platform signature verification between browser (Web Crypto API) and server (Node.js native crypto).

### Cross-Site Scripting (XSS)

XSS attacks inject malicious scripts into trusted websites. This project prevents XSS through:

- **Output encoding**: User-generated content is escaped before rendering
- **Content Security Policy**: Restricts script sources
- **Input validation**: Malicious input rejected at the API level before it reaches the database

---

## Rate Limiting

Rate limiting prevents abuse by capping requests per time window:

| Endpoint            | Window | Max Requests | Purpose                  |
| ------------------- | ------ | ------------ | ------------------------ |
| Registration        | 15 min | 5            | Prevent mass accounts    |
| Login               | 15 min | 10           | Prevent brute force      |
| OTP (send/verify)   | 15 min | 5            | Prevent OTP flooding     |
| Vote submission     | 1 hour | 10           | Prevent vote stuffing    |
| All other endpoints | 15 min | 100          | General abuse prevention |

All rate-limited endpoints return `429 Too Many Requests` with `RateLimit-*` headers indicating the current state.

Rate limiting is applied per IP address using `express-rate-limit`.

---

## Encryption at Rest

Sensitive data is encrypted before storage:

### Voter Profile Encryption

Voter personal information (name, email, student ID) is encrypted before being stored in MySQL. This protects against database compromise — even if an attacker gains read access to the database, they cannot read voter identities without the encryption key.

### Ballot Encryption

Ballots are encrypted **client-side** with RSA-OAEP before transmission. The encrypted ballot is:

1. Sent to the backend
2. Stored in the database
3. Recorded on the blockchain

The plaintext ballot is never transmitted over the network or stored on the server. Only the election authority can decrypt ballots during tallying, using the RSA private key.

---

## Byzantine Fault Tolerance

A **Byzantine fault** is a node that behaves arbitrarily — it might send conflicting data, produce invalid blocks, or attempt to subvert consensus.

### The Threshold

With 4 nodes in the network:

```text
Total nodes:        4
Byzantine tolerance: 1 (25%)
Required honest:    3 (75%)
```

If 2+ nodes are compromised, the system cannot guarantee correctness. This is an inherent limitation of BFT systems with few nodes.

### Mitigations

| Mechanism         | What It Does                                                   |
| ----------------- | -------------------------------------------------------------- |
| Behavior tracking | Scores each node's trustworthiness over time                   |
| Quarantine        | Isolates nodes that exhibit suspicious behavior                |
| Block validation  | Every block verified before acceptance (hash, PoW, signatures) |
| Chain comparison  | Nodes compare chains; longest valid chain wins                 |
| Recovery protocol | Phased recovery (detect → recover → validate → complete)       |

### Behavior Scoring

Nodes earn trust scores based on:

- Valid block submissions
- Consistent chain state with peers
- Response time and reliability
- Absence of conflicting messages

Falling below trust thresholds triggers quarantine — the node is excluded from consensus until it demonstrates valid behavior.

---

## Pseudonym Identity

The system separates **real identity** from **on-chain identity**:

```text
┌──────────────┐         ┌──────────────┐
│  REAL ID     │         │  PSEUDONYM   │
│  Name        │  hide   │  Nullifier   │
│  Email       │────────▶│  Public key  │
│  Student ID  │         │  Encrypted   │
│              │         │  ballot      │
└──────────────┘         └──────────────┘
     (known to                (known to
      registrar)               blockchain)
```

- **Registration**: The institution API verifies the voter's real identity and provides a blind token
- **Voting**: The blind token links eligibility to the nullifier without revealing identity
- **Blockchain**: Only nullifiers and public keys appear on-chain — no names, emails, or student IDs

This is critical for **voter privacy** — even if the blockchain is public, observers cannot link votes to specific voters.

---

## Threat Model Summary

| Threat               | Attack Vector                      | Mitigation                          |
| -------------------- | ---------------------------------- | ----------------------------------- |
| Double voting        | Submit vote twice                  | Nullifier uniqueness check          |
| Ballot tampering     | Modify encrypted ballot in transit | ECDSA signatures, hash verification |
| Replay attack        | Resubmit captured vote             | Deterministic transaction hashes    |
| SQL injection        | Malicious input fields             | Parameterized queries               |
| Brute force login    | Repeated login attempts            | Rate limiting, lockout              |
| Privilege escalation | Access admin endpoints as voter    | Role-based middleware               |
| XSS                  | Inject scripts in forms            | Output encoding, CSP                |
| Node compromise      | Malicious blockchain node          | BFT, quarantine, chain validation   |
| Vote selling         | Voter proves how they voted        | Receipt-free voting design          |
| Database breach      | Read voter data directly           | Encryption at rest                  |

---

## Further Reading

- [Threat Model Details](../security/threat-model.md) — complete threat enumeration and mitigations
- [Security Audit Report](../security/audit.md) — audit findings and resolutions
- [Security Operations](../security/operations.md) — operational security procedures
- [Cryptography Concepts](./cryptography.md) — how crypto primitives provide security guarantees
- [E-Voting Concepts](./voting-system.md) — security in the context of the voting lifecycle
