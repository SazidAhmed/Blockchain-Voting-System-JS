# Appendix — Technical Terms & Concepts

Reference guide for all technical terms used in this project. Grouped by domain.

---

## Blockchain Fundamentals

**Blockchain**
Distributed ledger where data stored in sequential blocks, each block linked to the previous via cryptographic hash. No single authority controls records. Tampering with one block invalidates every block after it.

**Block**
A batch of transactions bundled together with metadata: index (block number), timestamp, previous block hash, own hash, nonce, and Merkle root. In this project, blocks store vote transactions.

**Genesis Block**
The first block in any blockchain (block index 0). Created manually with no previous hash. All subsequent blocks trace back to genesis.

**Hash**
Fixed-length string produced by running data through a hash function. Same input always produces same output. One-way: cannot reverse a hash to recover the original data. Any change to input produces a completely different output (avalanche effect).

**Proof of Work (PoW)**
Consensus mechanism where miners compete to find a nonce that, when hashed with block data, produces a hash meeting a difficulty target (e.g., starting with "0000"). Computationally expensive to produce, trivial to verify. Prevents spam andSybil attacks.

**Nonce**
Number incremented repeatedly during mining until the resulting hash meets the difficulty target. Stands for "number used once." Not secret — public counter for PoW.

**Difficulty**
Target that a block hash must meet. Higher difficulty = more leading zeros required = more computational work. In this project: difficulty 2 in dev, adjustable in production.

**Consensus**
Mechanism by which blockchain nodes agree on the current state of the chain. This project uses PoW for block production and longest-chain rule for conflict resolution.

**Longest-Chain Rule**
When two valid chains diverge, nodes adopt the longest one. Resolves forks without central coordination.

**Fork**
When two or more valid chain branches exist simultaneously, typically due to network latency or competing blocks. The longest-chain rule resolves forks automatically. In this project, forks are minimized via BFT-style validator coordination.

**Mempool**
Pool of pending transactions waiting to be mined into a block. Transactions sit in mempool until a miner includes them in a new block.

**Peer-to-Peer (P2P)**
Network model where each node communicates directly with others, no central server. Blockchain nodes discover peers via `PEERS` env var and communicate via Socket.IO.

---

## Cryptographic Hash Functions

**SHA-256**
Secure Hash Algorithm, 256-bit output (32 bytes, 64 hex characters). Part of the SHA-2 family by NSA/NIST. Deterministic, one-way, collision-resistant, avalanche effect. Used for nullifiers, transaction hashes, block hashes, and Merkle trees in this project.

```text
SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e7304...
SHA-256("hello!") = 2b4c793ea671c57b77e1f7b7e8c0a0b1c2d3e4f5...
```

Notice: one character difference produces a completely different hash. This is the avalanche effect.

**Hash Chaining**
Each audit log entry stores the hash of the previous entry, creating a linked chain. Modifying any entry breaks the chain forward, making tampering detectable. Same principle behind blockchain blocks.

**Collision Resistance**
Computational infeasibility of finding two different inputs that produce the same hash output. SHA-256 has 2^128 collision resistance (birthday bound).

**Deterministic Hash**
Same input always produces same output. Critical for transaction hashes — resubmitting the same vote produces the same hash, preventing duplicate records.

**Timing-Safe Comparison**
Comparison that takes the same amount of time regardless of input, preventing timing side-channel attacks. The backend uses `crypto.timingSafeEqual()` for OTP comparison and API key verification. Without this, an attacker could infer correct values character by character from response timing.

---

## Elliptic Curve Cryptography (ECC)

**Elliptic Curve**
A mathematical curve defined by y^2 = x^3 + ax + b over a finite field. Points on the curve can be "added" together via scalar multiplication. The security assumption: computing n \* G (given G and n) is easy, but recovering n from the result is the Elliptic Curve Discrete Logarithm Problem (ECDLP) — computationally infeasible for large curves.

**P-256 (secp256r1)**
NIST-standardized elliptic curve with 256-bit key size. Provides ~128-bit security level. Faster and smaller keys than RSA for equivalent security. Used for ECDSA digital signatures in this project.

**Private Key**
Secret scalar value (256 bits for P-256). Never shared. Used to sign data. Stored encrypted in browser localStorage. If compromised, attacker can forge signatures.

**Public Key**
Point on the curve derived from the private key via scalar multiplication (Q = d \* G). Freely shared. Used to verify signatures. Does not reveal the private key.

**Key Pair**
A matched private key + public key. Data signed with the private key can only be verified with the corresponding public key.

---

## Digital Signatures

**ECDSA (Elliptic Curve Digital Signature Algorithm)**
Produces digital signatures using ECC. Provides: authentication (only private key holder could sign), integrity (any modification invalidates signature), non-repudiation (signer cannot deny signing). Used for vote signing and JWT signing in this project.

**Signing Process**

1. Hash the message with SHA-256
2. Generate random nonce k
3. Compute point (x1, y1) = k \* G on the curve
4. Compute r = x1 mod n (curve order)
5. Compute s = k^-1 _(h + r_ d) mod n
6. Signature = (r, s) — two 32-byte values for P-256

**Verification Process**

1. Hash the message with SHA-256
2. Compute u1 = h \* s^-1 mod n
3. Compute u2 = r \* s^-1 mod n
4. Compute point (x1, y1) = u1 _G + u2_ Q
5. Valid if x1 mod n == r

Uses only the public key — anyone can verify without accessing the private key.

**IEEE P1363**
Signature encoding format where r and s values are concatenated (r || s, 64 bytes for P-256). The backend parses signatures in this format for verification.

**SPKI (SubjectPublicKeyInfo)**
Standard format for encoding public keys. Includes algorithm identifier and key data. Backend parses SPKI-encoded keys to extract P-256 x/y coordinates for verification.

**DER (Distinguished Encoding Rules)**
Binary encoding format for cryptographic structures. Public keys may be DER-encoded before SPKI wrapping.

---

## Encryption

**Symmetric Encryption**
One shared key for both encrypt and decrypt. Fast (AES processes GB/s). Problem: how to securely share the key? AES-256-GCM used for tally encryption (server-side, key stored in DB).

**Asymmetric Encryption**
Key pair: public key encrypts, private key decrypts. Slower (~1000x than symmetric). Solves key distribution: public key shared openly. RSA-OAEP used for ballot encryption in this project.

**RSA-OAEP**
RSA with Optimal Asymmetric Encryption Padding. 2048-bit keys. OAEP padding makes RSA semantically secure (indistinguishable under chosen-plaintext attack). Used for ballot encryption because it natively supports encryption (unlike ECDSA which only does signatures).

```text
Encryption: ciphertext = RSA-OAEP-Encrypt(ballot, election_public_key)
Decryption: ballot = RSA-OAEP-Decrypt(ciphertext, election_private_key)
```

**AES-256-GCM**
Advanced Encryption Standard, 256-bit key, Galois/Counter Mode. Symmetric authenticated encryption — provides confidentiality (encryption) and authenticity (authentication tag) in one pass. Used for encrypting vote tallies before results release.

| Component | Size                |
| --------- | ------------------- |
| Key       | 256 bits (32 bytes) |
| IV/Nonce  | 96 bits (12 bytes)  |
| Auth Tag  | 128 bits (16 bytes) |

**OAEP Padding**
Optimal Asymmetric Encryption Padding. Adds randomness to RSA encryption, preventing deterministic ciphertext (same plaintext + same key = different ciphertext each time). Required for semantic security.

**Authenticated Encryption**
Encryption that also produces an authentication tag. Any modification to ciphertext invalidates decryption. AES-GCM provides this. Prevents both eavesdropping and tampering.

---

## Key Management

**Web Crypto API**
Browser native cryptographic API (`window.crypto.subtle`). Provides ECDSA P-256, RSA-OAEP, AES-GCM, PBKDF2, and SHA-256 operations. Used for all client-side crypto: key generation, signing, encryption, key derivation. Private keys are `CryptoKey` objects in memory, never directly exposed to JavaScript.

**Key Generation**
Client-side creation of ECDSA + RSA keypairs via Web Crypto API. Happens during voter registration. Private keys never leave the browser.

**Key Storage**
Private keys encrypted with AES-256-GCM using a PBKDF2-derived key from the user's password, stored in browser localStorage under `voting_keys_{userId}`. Public keys sent to backend during registration.

**Key Lifecycle**
Generate (registration) → Load (login) → Use (signing/encryption) → Clear (logout). Keys held in memory as CryptoKey objects for session lifetime.

**Key Backup**
Export private keys as base64 with security warning. User must store securely. Can re-import via `importKeysFromBackup()`.

**Key Revocation**
Not currently implemented. Production recommendation: IndexedDB with Hardware Security Module (HSM) or WebAuthn.

---

## Password & Key Derivation

**PBKDF2 (Password-Based Key Derivation Function 2)**
Derives a cryptographic key from a password + salt. Configurable iterations (100,000 in this project) to slow brute-force attacks. Output: 256-bit key used to encrypt private keys in localStorage.

**bcrypt**
Password hashing algorithm with built-in salt and adjustable work factor (10 rounds here). Used for hashing user passwords on the backend. Not reversible — login compares hash of input against stored hash.

**Salt**
Random value added to password before hashing. Prevents rainbow table attacks (precomputed hash lookups). Each user gets a unique salt.

---

## Nullifiers

**Nullifier**
Unique per-voter-per-election identifier derived from: `SHA-256(privateKey || "||" || electionId)`. Prevents double-voting. Deterministic: same voter + same election = same nullifier. Different elections produce different nullifiers. Irreversible: cannot recover private key from nullifier.

**Double-Vote Prevention**
Core election integrity mechanism. Backend checks nullifier uniqueness before accepting any vote. If nullifier already exists in `votes_meta`, vote rejected. Nullifiers derived server-side from authenticated user — clients cannot supply arbitrary nullifiers.

---

## Merkle Trees

**Merkle Tree**
Binary hash tree. Leaf nodes = hashes of individual transactions. Internal nodes = hash of their two children. Root node (Merkle root) compactly represents all data. Changing any transaction changes the root.

```text
              Root
             /    \
         Hash(AB)  Hash(CD)
         /    \    /    \
      Hash(A) Hash(B) Hash(C) Hash(D)
        |       |       |       |
       Tx A    Tx B    Tx C    Tx D
```

**Merkle Root**
Top hash of a Merkle tree. Included in block header. Any change to block transactions changes the root, which changes the block hash — tamper-evident.

**Merkle Proof**
Set of sibling hashes along the path from a leaf to the root. Allows verifying a specific transaction is in the block without downloading all transactions. Proof size: O(log n) hashes.

**Merkle Proof Verification**
Recompute the root from the leaf using the sibling hashes. If computed root matches block's merkleRoot, transaction is confirmed as included and untampered.

**Inclusion Proof**
Demonstrating a specific vote exists in a block via Merkle proof. Voter receives transaction hash, requests proof, verifies against merkleRoot.

---

## Merkle Trees in This Project

`services/blockchain-node/src/core/merkleTree.js` implements binary Merkle tree:

- Leaves: vote data hashes
- Odd nodes: duplicate last sibling
- `getProof()`: returns O(log n) sibling hashes
- `verifyProof()`: walks siblings to recompute root

API endpoints: Merkle root per block/election, proof per vote, batch-verify multiple proofs.

---

## Byzantine Fault Tolerance (BFT)

**Byzantine Fault**
Any failure where a node behaves arbitrarily — lies, sends conflicting data, produces invalid blocks, or actively subverts consensus. Named after the Byzantine Generals Problem.

**BFT Threshold**
With N nodes, system tolerates up to f = floor((N-1)/3) Byzantine nodes. With 4 nodes: tolerates 1 (25%). With 67% honest nodes required for correctness.

**PBFT (Practical Byzantine Fault Tolerance)**
Specific BFT algorithm with O(N^2) message complexity. Documented as production target for this project but not yet implemented — PoW remains default.

**Quarantine**
Mechanism to isolate misbehaving nodes. `SecurityMonitor` tracks violations per peer. Auto-isolation at 5 violations. Manual review required for release. Quarantined nodes excluded from consensus.

**Behavior Scoring**
Nodes earn trust scores based on: valid block submissions, consistent chain state with peers, response time, absence of conflicting messages. Falling below threshold triggers quarantine.

---

## Consensus Mechanisms

**Mining**
Process of creating a new block from pending transactions. In PoW: find a nonce producing a hash meeting difficulty target. Block signed with node's ECDSA key, broadcast to peers.

**Block Validation**
Before accepting a block, nodes verify: sequential indices, previousHash links match, block hash integrity, validator signatures against registered public keys.

**Chain Synchronization**
When nodes diverge, they sync using a phased protocol: detect (discover being behind) → recover (request missing blocks) → validate (verify each block) → complete (resume operation).

---

## Network & Communication

**Socket.IO**
Real-time bidirectional WebSocket-based communication library. Used for P2P messaging between blockchain nodes. Message types: NODE_JOIN, CHAIN_REQUEST, CHAIN_RESPONSE, HEARTBEAT, VOTE_BROADCAST, BLOCK_BROADCAST, MINE.

**Heartbeat**
Regular ping/pong messages between peers to confirm liveness. Part of peer health monitoring. Missing heartbeats indicate unhealthy peers.

**Thundering Herd**
Scenario where multiple nodes simultaneously attempt the same action (e.g., connecting to peers at startup). Prevented by staggering peer connections by 2 seconds.

**P2P Messaging**
Direct node-to-node communication without central coordinator. Used for chain synchronization, vote broadcasting, block broadcasting, and mining requests.

---

## Authentication & Authorization

**JWT (JSON Web Token)**
Compact, URL-safe token format for transmitting claims. Contains user ID, role, expiration. Signed with ECDSA (or HMAC-SHA256 for backward compat). Set as httpOnly cookie. Includes JTI (JWT ID) for revocation support.

**JTI (JWT ID)**
Unique identifier per JWT token. Used for token revocation — invalidated tokens are added to a blacklist by their JTI. Logout and password change invalidate the current token's JTI.

**httpOnly Cookie**
Cookie inaccessible to JavaScript — prevents XSS theft of JWT. Set by backend on login, sent automatically by browser on subsequent requests.

**CSRF (Cross-Site Request Forgery)**
Attack where malicious site tricks user's browser into making requests to your site. Mitigated by double-submit cookie pattern: server sets `csrf-token` cookie, client sends it back as `x-csrf-token` header on state-changing requests.

**Double-Submit Cookie Pattern**
CSRF protection: server sets a random token in a cookie. Client reads the cookie and sends the value as a header. Server verifies both match. No server-side session storage needed.

**RBAC (Role-Based Access Control)**
Access control based on user roles. Three roles: `voter` (vote, view), `admin` (create elections, manage), `board_member` (full lifecycle). Enforced via middleware before route handlers.

**Auth Middleware**
Express middleware layers: `auth` (any authenticated user), `adminAuth` (admin/board_member only). Applied to routes to enforce access control.

**Token Revocation**
Tokens include JTI claim. Revoked tokens added to in-memory blacklist. Logout and password change invalidate current token.

---

## Input Validation & Security

**SQL Injection (SQLi)**
Attack where malicious SQL is inserted via user input. Prevented by parameterized queries (prepared statements) — user input never interpolated into SQL strings.

```text
-- Safe (used in this project):
SELECT * FROM users WHERE id = ?
-- Unsafe (NOT used):
SELECT * FROM users WHERE id = '${userInput}'
```

**XSS (Cross-Site Scripting)**
Attack injecting malicious scripts into trusted websites. Prevented by: output encoding (escape user content before rendering), Content Security Policy (restrict script sources), input validation at API level.

**Content Security Policy (CSP)**
HTTP header restricting which resources browsers can load. Configured via Helmet.js. Prevents XSS by whitelisting allowed script sources.

**Helmet.js**
Express middleware setting security HTTP headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection. Removes X-Powered-By header.

**HSTS (HTTP Strict Transport Security)**
Header telling browsers to only use HTTPS. Configured with 1-year max-age and preload. Prevents protocol downgrade attacks.

**Rate Limiting**
Cap on requests per time window per IP. Prevents brute force, vote stuffing, API abuse. Uses `express-rate-limit` with in-memory store. 6 tiers: register (5/15min), login (10/15min), vote (10/hr), admin (30/15min), OTP (5/15min), general (100/15min). Returns `429 Too Many Requests` with headers showing limit state.

| Endpoint     | Window | Max |
| ------------ | ------ | --- |
| Registration | 15 min | 5   |
| Login        | 15 min | 10  |
| Vote         | 1 hour | 10  |
| General      | 15 min | 100 |

**Input Validation**
Checking user input at trust boundaries: type, length, pattern, range. Implemented via `express-validator` on all endpoints.

---

## E-Voting Concepts

**Ballot Secrecy**
Ensuring no one can determine how a voter voted. Achieved via client-side RSA-OAEP encryption — plaintext ballot never leaves the voter's device in readable form. Server only sees ciphertext.

**Eligibility Verification**
Confirming a voter is authorized to vote. Multi-step: institution verifies identity → OTP email verification → key generation → blind token issued.

**Blind Signature**
Cryptographic protocol where signer signs a message without seeing its content. Voter's client blinds a random token, server signs it blindly, voter unblinds. Server cannot link token to voter. Prevents coercion and vote selling.

**Pseudonym Identity**
Separating real identity from on-chain identity. Real identity known to registrar only. On-chain: nullifier + public key + encrypted ballot. Observers cannot link votes to voters.

**Receipt-Free Voting**
Design where voters cannot prove to third parties how they voted. Prevents vote selling and coercion. Transaction hash proves "a vote was recorded" but not "which candidate was chosen."

**Vote Selling**
Voter proves how they voted in exchange for payment. Prevented by: client-side encryption (plaintext never intercepted), receipt-free design (no proof of candidate choice), deterministic encryption (ciphertext meaningless without private key).

**Election Lifecycle**
States: Draft → Pending → Active → Completed. Each transition enforced. Completed elections are immutable — no votes added/removed, parameters cannot change.

**Election Locking**
Sets `is_locked=true` on election and candidates. Prevents candidate add/delete and election updates. Voting continues normally. Intended for freezing configuration before or during voting.

**Auto-Release Results**
Backend scheduler (60-second interval) automatically transitions ended elections: checks `status='active' AND end_date < NOW() AND results_released=FALSE`, sets `results_released=TRUE`. Allows public access to tallies without manual admin action.

---

## Database

**MySQL 8.0**
Relational database management system. Stores off-chain metadata: users, elections, candidates, voter registrations, audit logs, vote metadata. Vote content encrypted on blockchain — DB holds supporting data.

**Schema**
Database structure: 13 tables, 3 views. Tracked via `schema_migrations` table with checksums. Migrations run automatically on Docker boot.

**Migration**
Versioned SQL files applying incremental schema changes. Numbered sequentially (001, 002...). Applied once, tracked via checksum in `schema_migrations`.

**Parameterized Queries**
SQL queries using placeholders (?) instead of string interpolation. Prevents SQL injection. All database queries in this project use parameterized statements.

**View**
Virtual table defined by a SQL query. Three views: `v_active_elections` (election stats), `v_node_health` (validator health), `admin_activity_summary` (admin action counts).

**Index**
Data structure speeding up queries. Critical indexes: `nullifier_hash` (UNIQUE) for double-vote prevention, `tx_hash` (UNIQUE) for receipt lookup, `election_id` for tally queries.

---

## Storage

**LevelDB**
Fast key-value store optimized for read-heavy workloads. Used by blockchain nodes for chain persistence at `./data/{nodeId}`. WAL-backed for crash recovery.

**localStorage**
Browser storage API. Used to store encrypted private keys under `voting_keys_{userId}`. Persists across sessions but cleared on logout.

**IndexedDB**
Browser storage API for larger structured data. Recommended for production key storage (replaces localStorage).

---

## Frontend

**Vue 3**
Progressive JavaScript framework for building UIs. Used for both frontend (voter UI) and admin panel. Composition API + Options API.

**Vite**
Build tool and dev server for Vue. Fast HMR (Hot Module Replacement). Used for both frontend and admin panel development.

**Vuex**
Vue state management library. Single module stores: auth (user, token), elections (list, current), UI (loading, error). Used in frontend.

**Pinia**
Vue state management library (Vuex successor). Used in admin panel. Simpler API, better TypeScript support.

**CSS Custom Properties (Variables)**
CSS variables defined in `tokens.css`. Three-layer theming: system default, manual override, localStorage persistence. All colors, spacing, typography use variables.

**Glass Effect**
CSS `backdrop-filter: blur()` with semi-transparent background. Applied via `.glass` class on cards.

---

## Monitoring & Observability

**Prometheus**
Time-series metrics database. Scrapes metrics from services every 15s. Retention: 30 days. Alert rules in `infra/alerts/*.yml`.

**Grafana**
Visualization dashboard for Prometheus metrics and Loki logs. Default login: admin/admin. Three pre-built dashboards for this project.

**Loki**
Log aggregation system. Stores Docker container logs. Query via LogQL in Grafana. No auth by default.

**Promtail**
Log shipper. Discovers Docker containers via socket, relabels with service/project labels, pushes to Loki.

**cAdvisor (Container Advisor)**
Google tool exposing container resource usage (CPU, memory, network, disk). Runs on port 8081.

**Node Exporter**
Prometheus exporter for host-level metrics (CPU, memory, disk, network). Runs on port 9100.

**MySQL Exporter**
Prometheus exporter for MySQL metrics (connections, queries, replication). Runs on port 9104.

**PromQL**
Prometheus query language. Example: `rate(http_requests_total{status="500"}[5m])` — 5-minute error rate.

**LogQL**
Loki query language. Example: `{service="backend"} |= "error"` — all error logs from backend.

---

## DevOps & Infrastructure

**Docker**
Platform for containerizing applications. Each service runs in its own container with isolated filesystem and network. Consistent environments across dev/CI/production.

**Docker Compose**
Tool defining multi-container Docker applications. YAML files specify services, networks, volumes, health checks. Used for main dev stack, test stack, monitoring stack, production stack.

**Dockerfile**
Build instructions for creating a Docker image. Each service has its own Dockerfile. `Dockerfile.prod` for production (static build, no dev server).

**Nginx**
Reverse proxy and web server. Used in production stack for SSL termination, static file serving, and request routing. Config at `infra/docker/nginx/nginx.conf`.

**Health Check**
Automated periodic probe checking if a service is running and responsive. Docker waits for healthchecks before starting dependent services. Endpoints: `/health` (backend), `/node` (blockchain), `/api/health` (institution-api).

**Environment Variables**
Configuration values passed to services at runtime. Stored in `.env` (gitignored). `.env.example` provides defaults. Examples: `JWT_SECRET`, `DB_PASSWORD`, `BLOCKCHAIN_API_KEY`.

**CI/CD (Continuous Integration/Continuous Deployment)**
Automated build/test/deploy pipeline. GitHub Actions workflow (`docker-build.yml`) runs `scripts/ci.sh` — same script runs locally. Checks: secrets scan, syntax, Docker build, service startup, endpoint tests.

**Trivy**
Vulnerability scanner. Scans filesystem for known CVEs in dependencies. Results uploaded to GitHub Security tab.

---

## Email

**SMTP (Simple Mail Transfer Protocol)**
Standard protocol for sending email. Configured via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars. Used for real (non-institutional) email addresses.

**Ethereal**
Fake SMTP service for development. Emails never delivered to real recipients — stored in Ethereal's web interface. Institutional emails (`@university.edu`) always route to Ethereal regardless of SMTP config.

**OTP (One-Time Password)**
6-digit code sent to institutional email during registration. Constant-time comparison via `OTPService`. 10-minute expiry, 3 attempts max, 60-second cooldown between sends. In-memory storage — no DB persistence.

---

## Cryptographic Encoding

**Base64**
Binary-to-text encoding using 64 ASCII characters. Used to transmit binary data (keys, signatures, ciphertext) over text-based protocols (HTTP, JSON).

**Hex**
Base16 encoding using characters 0-9 and a-f. Used for hash outputs (SHA-256 produces 64 hex characters) and some key encodings.

**PEM (Privacy-Enhanced Mail)**
Base64-encoded DER format for cryptographic keys/certificates. RSA public keys stored as SPKI PEM in `elections.public_key`.

**PKCS#8**
Private key encoding format. Used when exporting private keys from Web Crypto API. Base64-encoded, can be encrypted.

---

## Advanced Cryptographic Concepts

**Threshold Encryption**
Splitting a decryption key into N shares where any T (threshold) shares can decrypt, but T-1 cannot. Used for election tally decryption — prevents any single authority from decrypting alone. Configured via `threshold_params` in `elections` table.

**DKG (Distributed Key Generation)**
Protocol generating a shared key among multiple parties without any single party knowing the full key. Referenced in `threshold_key_shares` table for election key ceremony.

**HSM (Hardware Security Module)**
Physical device storing cryptographic keys securely. Recommended for production key storage. Tamper-resistant, never exposes private keys.

**WebAuthn**
Web standard for passwordless authentication using public-key cryptography. Recommended for production key access alongside HSM.

**Zero-Knowledge Proof (ZKP)**
Cryptographic proof that a statement is true without revealing any information beyond the validity of the statement. Referenced in `tally_partial_decryptions.proof_of_correctness` for verifying correct partial decryption.

**Blind Signature Protocol**

1. Client generates random token, computes blinding factor
2. Client sends blinded token + pseudonym_id to `POST /api/elections/:id/blind-sign`
3. Server verifies eligibility, signs blinded token, stores `token_id_hash`
4. Client unblinds signature, stores token locally
5. To vote: client presents token + signature — server verifies without learning token itself

---

## Project-Specific Terms

**Transaction Hash**
Deterministic SHA-256 of `{electionId, nullifier, encryptedBallot, timestamp}`. Server-computed on vote submission. Returned as receipt. Allows independent verification.

**Vote Package**
Client-side constructed object containing: encryptedBallot (RSA-OAEP), nullifier (SHA-256), electionId, timestamp. Signed with ECDSA private key before submission.

**Encrypted Tally**
AES-256-GCM encrypted vote counts per candidate. Stored as base64: `IV(12B) + AuthTag(16B) + Ciphertext`. Returned via API until admin releases results.

**Vote Receipt**
Server response after successful vote: transactionHash, nullifier, timestamp, blockIndex. Proves participation, not choice — coercion resistant.

**Election Public Key**
RSA-2048 SPKI PEM public key generated during election creation. Used to encrypt ballots. Private key held by election authority for tally decryption.

**Tally Key**
Random 256-bit AES key per election. Stored in `elections.tally_key`. Encrypts vote tallies before results release.

**Pseudonym ID**
SHA-256 hash for on-chain identity. Separate from `institution_id`. Links to `blind_tokens` and `voter_registrations` without revealing real identity.

**Registration Token**
Legacy token in `voter_registrations.registration_token`. Prefer blind tokens for new implementations.

**Blind Token Hash**
SHA-256 of unblinded token, stored in `blind_tokens.token_id_hash`. Server never sees actual token — only hash for uniqueness checks.

---

## Testing

**Integration Testing**
Testing against a running Docker stack. No unit test framework — all tests are shell scripts hitting live HTTP endpoints. 6 categories: smoke, integration, attack, detection, security, resilience.

**Smoke Test**
Quick validation: health check, login, vote, double-vote rejection. First test to run.

**Attack Test**
Security-focused: tampered ballot, replay attack, SQL injection, no-auth access, JWT tampering, rate limiting.

**Resilience Test**
Fault tolerance: node restart, chain sync, backend restart. Verifies system recovers from failures.

---

## Code Conventions

**Conventional Commits**
Commit message format: `type(scope): description`. Types: fix, feat, docs, refactor, ci, chore. Enforced by pre-commit hook.

**Squash and Merge**
GitHub merge strategy combining all PR commits into one. Clean history, commit message auto-fills from PR title.

**Pre-commit Hook**
Git hook running on `git commit`. Checks: secrets scan, JavaScript syntax, console.log warning (non-blocking).

**Pre-push Hook**
Git hook running on `git push`. Runs `scripts/run-all-checks.sh`: branch name, commit message, secrets, syntax, console.log, env coverage.

---

## Cross-Reference Audit

Results of cross-checking all documentation against the actual codebase for broken file references. Seven issues found and fixed:

| #   | Broken Reference                                            | Type                    | Fixed In                                                                                                                  | Action                                                             |
| --- | ----------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `services/backend/utils/crypto.js`                          | Renamed to `signing.js` | AGENTS.md, `docs/architecture/crypto.md`, `docs/development/crypto-implementation.md`, `docs/Final_report/*.md` (6 files) | Updated all references to `signing.js`                             |
| 2   | `services/frontend AdminDashboard:394`                      | Invalid path            | `docs/Final_report/improvement.md`                                                                                        | Changed to `services/admin-panel/src/views/AdminDashboard.vue:394` |
| 3   | `services/backend/.env`                                     | Wrong path              | `docs/security/operations.md`                                                                                             | Changed to `.env` at project root                                  |
| 4   | `infra/docker/nginx/ssl/`                                   | Directory doesn't exist | `docs/deployment/setup.md`                                                                                                | Changed to `Create ... and place`                                  |
| 5   | `services/backend/models/`                                  | Directory doesn't exist | AGENTS.md                                                                                                                 | Removed from file layout                                           |
| 6   | `backend/utils/crypto.js` (missing `services/` prefix)      | Wrong path              | `docs/Final_report/PROJECT_REPORT_FINAL_IEEE.md`, `PROJECT_REPORT_DRAFT.md`                                               | Added prefix + fixed filename                                      |
| 7   | `services/backend/routes/elections.js` (split into 4 files) | Path ambiguous          | All docs referencing it                                                                                                   | Noted as valid legacy reference                                    |

**Minor discrepancies found but NOT fixed** (no functional impact):

- `docs/project/structure.md` lists `.opencode/` and `infra/docker/nginx/logs/` directories that don't exist on disk — these are expected locations for tooling/runtime artifacts
- `infra/docker/nginx/ssl/` directory doesn't exist — now documented as needing creation
