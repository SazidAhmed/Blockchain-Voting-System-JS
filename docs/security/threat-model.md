# Threat Model

## Overview

Threat model for the Blockchain Voting System covering attack surfaces across frontend, backend, blockchain nodes, and institution API.

## Attack Surfaces

| Surface           | Vector                          | Impact                          |
| ----------------- | ------------------------------- | ------------------------------- |
| Tampered ballot   | Modify encrypted ballot payload | Undetected vote manipulation    |
| Replay attack     | Resubmit captured vote          | Multiple votes counted          |
| SQL injection     | Malicious input to API fields   | Data exfiltration or corruption |
| No-auth access    | Call API without token          | Unauthorized admin operations   |
| JWT tampering     | Forge or modify JWT             | Privilege escalation            |
| Double-vote       | Same voter votes multiple times | Election fraud                  |
| XSS               | Inject scripts via form fields  | Session theft, defacement       |
| Rate-limit bypass | Flood API endpoints             | Denial of service               |

## Mitigations

### Cryptographic Protections

- **ECDSA P-256 signatures**: Every vote signed client-side via Web Crypto API. Backend verifies signature before acceptance.
- **RSA-OAEP 2048-bit encryption**: Ballot encrypted with election public key. Only authorized tally decrypts.
- **SHA-256 nullifiers**: Client-side hash of `privateKey || "||" || electionId` prevents double-vote. Nullifier checked for uniqueness on submission.
- **Transaction hashes**: SHA-256 of `{electionId, nullifier, encryptedBallot, timestamp}` — tamper-evident chain.

### Application Security

| Layer            | Mitigation                                                         | Implementation                              |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| Transport        | Helmet.js headers (CSP, HSTS, X-Frame-Options)                     | `services/backend/index.js`                 |
| CORS             | Restricted origins (`localhost:5173`, `localhost:5174`)            | `services/backend/index.js`                 |
| Auth             | JWT with ECDSA verification, middleware on all protected routes    | `services/backend/middleware/`              |
| Input validation | express-validator on all endpoints (type, length, pattern, escape) | `services/backend/middleware/validation.js` |
| Rate limiting    | Registration: 5/15min, Login: 10/15min, Voting: 10/hour            | Backend middleware                          |
| Request limits   | 1MB body limit, 30s timeout                                        | `services/backend/index.js`                 |
| Mutation locking | Elections locked after activation (403 on candidate add/delete)    | `services/backend/routes/elections.js`      |

### Audit Trail

- `admin_audit_logs` table: All admin actions logged with SHA-256 change hash, IP, user-agent, timestamp.
- `admin_security_logs` table: Security events classified LOW/MEDIUM/HIGH/CRITICAL.
- Integrity verification endpoint recalculates hash to detect tampering.

### Blockchain Node Security

- SecurityMonitor module: real-time peer behavior tracking, anomaly detection (replay, sybil, eclipse).
- Quarantine mechanism: peer auto-isolated after 5 violations. Manual review required for release.
- Byzantine fault tolerance: 5-node network tolerates 1 faulty node.

## Trust Boundaries

```text
[Browser] --TLS--> [Backend:3000] --TLS--> [Blockchain Nodes:3001-3004]
                        |
                   [MySQL]  [Institution API:4000]
```

- Browser-to-backend: ECDSA signatures prevent ballot tampering.
- Backend-to-blockchain: Authenticated internal API calls.
- Backend-to-MySQL: Parameterized queries prevent SQL injection.
- Backend-to-institution: Validated institution IDs prevent impersonation.

## Assumptions

- TLS terminates at the backend reverse proxy.
- Institution API is trusted for voter identity verification.
- Client-side Web Crypto API executes in uncompromised browser.
- Private keys (voter signing, JWT secret, DB credentials) stored securely outside codebase.

## Further Reading

- [Security Audit](audit.md) — hardening results, vulnerability details
- [Security Operations](operations.md) — incident response, key rotation, maintenance
- **New to security concepts?** See the [Knowledge Base](../knowledge/security.md) for academic explanation of authentication, encryption, and threat modeling
