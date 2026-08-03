# Security Audit

## Audit Results

### Phase 1: Security Hardening (Completed)

| Category         | Before              | After                                            |
| ---------------- | ------------------- | ------------------------------------------------ |
| Security headers | None                | Helmet.js with CSP, HSTS, X-Frame-Options        |
| CORS             | Allow all origins   | Restricted to `localhost:5173`, `localhost:5174` |
| Input validation | None                | express-validator on all endpoints               |
| Request limits   | None                | 10MB body limit, 30s timeout                     |
| Error messages   | Stack traces leaked | Production-safe messages                         |
| X-Powered-By     | Exposed             | Removed                                          |

### Phase 2: Audit Logging (Completed)

| Feature                     | Implementation                                  | Status   |
| --------------------------- | ----------------------------------------------- | -------- |
| Admin audit trail           | `admin_audit_logs` table, SHA-256 hashed        | Verified |
| Security event logging      | `admin_security_logs` table, severity levels    | Verified |
| Mutation locking            | Elections lock on activation, 403 on mutation   | Verified |
| Hash integrity verification | Recalculate SHA-256 on demand, detect tampering | Verified |
| Frontend audit viewer       | AdminAuditLogs.vue with filter/paginate/verify  | Verified |

### Phase 3: Blockchain Node Monitoring (Completed)

| Feature                | Implementation                                                          | Status     |
| ---------------------- | ----------------------------------------------------------------------- | ---------- |
| Peer behavior tracking | SecurityMonitor tracks violations per peer                              | Integrated |
| Anomaly detection      | Block/vote analysis (future timestamps, invalid hashes, oversized data) | Verified   |
| Quarantine management  | Auto-isolation at 5 violations, API for manual release                  | Verified   |
| Evidence collection    | Violation history with full metadata                                    | Verified   |

## Vulnerabilities Found and Fixed

| ID    | Finding                             | Severity | Fix                                                        |
| ----- | ----------------------------------- | -------- | ---------------------------------------------------------- |
| V-001 | No input validation on any endpoint | CRITICAL | `middleware/validation.js` with type/length/pattern checks |
| V-002 | CORS allowed all origins            | HIGH     | Restricted to known frontend origins                       |
| V-003 | No security headers (CSP, HSTS)     | HIGH     | Helmet.js configured                                       |
| V-004 | Stack traces in error responses     | MEDIUM   | Production-safe error handler                              |
| V-005 | No request size limits              | MEDIUM   | 1MB body limit                                             |
| V-006 | No request timeout                  | MEDIUM   | 30s timeout                                                |
| V-007 | X-Powered-By header leaked stack    | LOW      | Header removed                                             |
| V-008 | Elections mutable after activation  | HIGH     | Mutation locking with is_locked flag                       |

## Security Hardening Measures

### Backend (`services/backend/index.js`)

- Helmet.js: CSP, HSTS (1 year, preload), X-Frame-Options, X-Content-Type-Options, X-XSS-Protection.
- CORS: Credentials enabled, methods GET/POST/PUT/DELETE/OPTIONS, headers Content-Type/Authorization.
- Body parsers: 1MB limit on JSON and URL-encoded.
- Timeouts: request and response 30s.
- Error handler: production mode hides details, development shows stack.

### Input Validation (`services/backend/middleware/validation.js`)

- Registration: username (2-100 chars, trimmed), email (valid format), institution ID (alphanumeric), password (min 8, upper+lower+digit), role (enum).
- Vote: election ID (integer ≥1), encryptedBallot (10-10000 chars), nullifier (64 hex), signature (64-512 chars), publicKey (64-512 hex).
- Election: title (5-255), description (10-5000), dates (ISO8601, end > start), candidates (2-50, each name 2-255).

### Admin Audit Logging (`services/backend/utils/adminAuditLogger.js`)

- `logAdminAction()`: Records admin ID, action type, resource, changes JSON, SHA-256 hash, IP, user-agent.
- `logFailedAction()`: Logs blocked mutation attempts with reason.
- `logSecurityEvent()`: Classifies events LOW/MEDIUM/HIGH/CRITICAL.
- `verifyAuditIntegrity()`: Recalculates hash, returns valid/invalid.

## Security Test Coverage

### Automated Tests (`tests/categories/`)

| Test Suite            | Scenarios                                                      |
| --------------------- | -------------------------------------------------------------- |
| `smoke-test.sh`       | Health check, login, vote, double-vote rejection               |
| `integration-test.sh` | Full vote lifecycle, blockchain consensus, audit trail         |
| `attack-test.sh`      | Tampered ballot, replay, SQLi, no-auth, JWT tamper, rate-limit |
| `detection-test.sh`   | Node health, chain consistency, Merkle statistics              |
| `security-suite.sh`   | No-auth vote, nullifier uniqueness, XSS, rate-limit            |
| `resilience-test.sh`  | Node restart, chain sync, backend restart                      |

### Manual Verification

- Header inspection via curl confirmed CSP, HSTS, CORS headers present.
- Invalid inputs (bad email, weak password, XSS strings) correctly rejected with 400.
- Vote submission with duplicate nullifier rejected.
- Mutation on locked election returns 403 and logs security event.
- Audit hash verification detects tampered log entries.
