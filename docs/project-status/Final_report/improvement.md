Priority Improvements - Task Breakdown

P0 - Critical (Must complete before production use)

1. Prevent role escalation at registration

- Remove client-controlled `role` from public signup.
- Enforce server-side role policy and separate admin-only user provisioning.
- Files: `services/backend/routes/users.js:18`, `services/backend/routes/users.js:55`, `services/backend/middleware/validation.js:53`

1. Remove backend private key generation/return

- Stop generating private keys on server for users.
- Never return private keys in API responses or logs.
- Refactor key flow so private key stays client-side only.
- Files: `services/backend/routes/users.js:42`, `services/backend/routes/users.js:108`, `services/backend/utils/crypto.js:22`

1. Replace fake election keys and disable plaintext ballot fallback

- Generate valid election encryption keys and store proper public keys.
- Remove fallback path that submits Base64/plain ballot payloads.
- Reject vote payloads that are not properly encrypted.
- Files: `services/backend/routes/elections.js:59`, `services/frontend/src/services/crypto.js:456`, `services/frontend/src/services/crypto.js:458`

1. Make vote submission atomic

- Wrap vote creation + state updates in database transactions.
- Add locking/uniqueness protections to prevent race-condition double voting.
- Add tests for concurrent vote attempts.
- Files: `services/backend/routes/elections.js:425`, `services/backend/routes/elections.js:557`, `services/backend/routes/elections.js:567`

1. Fail closed when blockchain is unavailable

- Remove simulated/fake transaction hash behavior in real flow.
- Return clear error and do not persist vote as successful when chain write fails.
- Files: `services/backend/routes/elections.js:550`, `services/backend/routes/elections.js:563`

1. Bind signature key to account identity

- Verify vote signature against the account-bound registered public key, not request-provided key.
- Reject mismatched key ownership even if cryptographic signature is valid.
- Files: `services/backend/routes/elections.js:456`, `services/backend/routes/elections.js:496`, `services/backend/routes/elections.js:534`

1. Secure blockchain-node mutating APIs

- Remove wildcard CORS for sensitive routes.
- Require authentication/authorization for `/vote`, `/mine`, `/validators/register`.
- Enforce stricter request validation and rate limiting.
- Files: `services/blockchain-node/index.js:30`, `services/blockchain-node/index.js:302`

1. Implement real blockchain signature verification

- Replace placeholder `return true` signature checks with actual cryptographic verification.
- Add negative-path tests for invalid signatures.
- Files: `services/blockchain-node/src/core/blockchain.js:198`, `services/blockchain-node/src/core/blockchain.js:214`

1. Validate full chain before replacement

- Verify integrity and validity of candidate chain before accepting longer chain.
- Reject malformed or tampered chains regardless of length.
- Files: `services/blockchain-node/index.js:121`, `services/blockchain-node/index.js:124`

P1 - High (Next sprint after P0)

1. Enforce election lock rules on update endpoints

- Apply `is_locked` checks to election update flows, not only candidate operations.
- Ensure locked elections are immutable for all write paths.
- Files: `services/backend/routes/elections.js:245`, `services/backend/routes/elections.js:672`

1. Remove duplicate candidate routes

- Consolidate duplicate endpoints into one policy-enforced implementation.
- Align validators and permission checks across the remaining route.
- Files: `services/backend/routes/elections.js:727`, `services/backend/routes/elections.js:804`, `services/backend/routes/elections.js:979`, `services/backend/routes/elections.js:1006`

1. Fix frontend/admin API contract mismatches

- Align request payloads, endpoints, and response mapping between admin UI and backend.
- Add integration tests for admin election/candidate operations.
- Files: `services/frontend AdminDashboard:394`, `services/frontend AdminDashboard:482`, `services/backend/routes/elections.js:623`, `services/backend/routes/elections.js:1006`

1. Remove hardcoded login defaults

- Remove demo/default credential prefill from user and admin login screens.
- Replace with empty fields and secure environment-based demo config if needed.
- Files: `services/frontend/src/views/LoginView.vue:52`, `services/admin-panel/src/views/LoginView.vue:43`, `services/admin-panel/src/views/LoginView.vue:61`

1. Fix auth state consistency across store/router

- Persist user auth state in a single source of truth.
- Update router guards to use store-backed state with safe fallback.
- Files: `services/frontend/src/store/index.js:43`, `services/frontend/src/router/index.js:62`

P2 - Medium (Quality and maintainability)

1. Clean up validation and legacy flow mismatch

- Apply `validateCreateElection` where imported.
- Remove legacy vote branch that conflicts with current crypto payload validator.
- Add coverage for expected/invalid payload shapes.
- Files: `services/backend/routes/elections.js:7`, `services/backend/routes/elections.js:30`, `services/backend/middleware/validation.js:99`, `services/backend/routes/elections.js:378`
