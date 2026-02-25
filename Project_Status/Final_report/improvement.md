Priority Improvements - Task Breakdown

P0 - Critical (Must complete before production use)

1. Prevent role escalation at registration
- Remove client-controlled `role` from public signup.
- Enforce server-side role policy and separate admin-only user provisioning.
- Files: `backend/routes/users.js:18`, `backend/routes/users.js:55`, `backend/middleware/validation.js:53`

2. Remove backend private key generation/return
- Stop generating private keys on server for users.
- Never return private keys in API responses or logs.
- Refactor key flow so private key stays client-side only.
- Files: `backend/routes/users.js:42`, `backend/routes/users.js:108`, `backend/utils/crypto.js:22`

3. Replace fake election keys and disable plaintext ballot fallback
- Generate valid election encryption keys and store proper public keys.
- Remove fallback path that submits Base64/plain ballot payloads.
- Reject vote payloads that are not properly encrypted.
- Files: `backend/routes/elections.js:59`, `frontend/src/services/crypto.js:456`, `frontend/src/services/crypto.js:458`

4. Make vote submission atomic
- Wrap vote creation + state updates in database transactions.
- Add locking/uniqueness protections to prevent race-condition double voting.
- Add tests for concurrent vote attempts.
- Files: `backend/routes/elections.js:425`, `backend/routes/elections.js:557`, `backend/routes/elections.js:567`

5. Fail closed when blockchain is unavailable
- Remove simulated/fake transaction hash behavior in real flow.
- Return clear error and do not persist vote as successful when chain write fails.
- Files: `backend/routes/elections.js:550`, `backend/routes/elections.js:563`

6. Bind signature key to account identity
- Verify vote signature against the account-bound registered public key, not request-provided key.
- Reject mismatched key ownership even if cryptographic signature is valid.
- Files: `backend/routes/elections.js:456`, `backend/routes/elections.js:496`, `backend/routes/elections.js:534`

7. Secure blockchain-node mutating APIs
- Remove wildcard CORS for sensitive routes.
- Require authentication/authorization for `/vote`, `/mine`, `/validators/register`.
- Enforce stricter request validation and rate limiting.
- Files: `blockchain-node/index.js:30`, `blockchain-node/index.js:302`

8. Implement real blockchain signature verification
- Replace placeholder `return true` signature checks with actual cryptographic verification.
- Add negative-path tests for invalid signatures.
- Files: `blockchain-node/blockchain.js:198`, `blockchain-node/blockchain.js:214`

9. Validate full chain before replacement
- Verify integrity and validity of candidate chain before accepting longer chain.
- Reject malformed or tampered chains regardless of length.
- Files: `blockchain-node/index.js:121`, `blockchain-node/index.js:124`

P1 - High (Next sprint after P0)

10. Enforce election lock rules on update endpoints
- Apply `is_locked` checks to election update flows, not only candidate operations.
- Ensure locked elections are immutable for all write paths.
- Files: `backend/routes/elections.js:245`, `backend/routes/elections.js:672`

11. Remove duplicate candidate routes
- Consolidate duplicate endpoints into one policy-enforced implementation.
- Align validators and permission checks across the remaining route.
- Files: `backend/routes/elections.js:727`, `backend/routes/elections.js:804`, `backend/routes/elections.js:979`, `backend/routes/elections.js:1006`

12. Fix frontend/admin API contract mismatches
- Align request payloads, endpoints, and response mapping between admin UI and backend.
- Add integration tests for admin election/candidate operations.
- Files: `frontend AdminDashboard:394`, `frontend AdminDashboard:482`, `backend/routes/elections.js:623`, `backend/routes/elections.js:1006`

13. Remove hardcoded login defaults
- Remove demo/default credential prefill from user and admin login screens.
- Replace with empty fields and secure environment-based demo config if needed.
- Files: `frontend/src/views/LoginView.vue:52`, `admin-panel/src/views/LoginView.vue:43`, `admin-panel/src/views/LoginView.vue:61`

14. Fix auth state consistency across store/router
- Persist user auth state in a single source of truth.
- Update router guards to use store-backed state with safe fallback.
- Files: `frontend/src/store/index.js:43`, `frontend/src/router/index.js:62`

P2 - Medium (Quality and maintainability)

15. Clean up validation and legacy flow mismatch
- Apply `validateCreateElection` where imported.
- Remove legacy vote branch that conflicts with current crypto payload validator.
- Add coverage for expected/invalid payload shapes.
- Files: `backend/routes/elections.js:7`, `backend/routes/elections.js:30`, `backend/middleware/validation.js:99`, `backend/routes/elections.js:378`
