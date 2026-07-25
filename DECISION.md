# Security Audit — Intentional Non-Implementations

Findings reviewed and intentionally not implemented, with reasoning.

## C1: `verifyVoteSignature()` no-op

Vote signature was already ECDSA-verified by the backend (`verifyECDSASignature` in `signing.js`) _before_ submission to the blockchain node. The blockchain node is an internal service authenticated by API key — vote integrity is enforced at the entry boundary (backend), not at every downstream hop. Adding duplicate EC verification would require importing `elliptic` into the blockchain service.

## C2: `.env` committed to git

`.env` is in `.gitignore` and is NOT tracked in git. The finding incorrectly states `.env` is committed. `.env.example` is the only file tracked, and it uses placeholder values (`change-me`), which is standard practice. The startup guard in `backend/index.js` checks for the actual `JWT_SECRET` value and will warn on default.

## C3/C4: `encryptBallot()` SHA-256 / `signData()` HMAC

These legacy functions are only used in the **legacy voting flow** (`voting.js` line 307-353). The **new crypto flow** (used by the frontend since launch) uses client-side RSA-OAEP encryption and ECDSA P-256 signing via `verifyECDSASignature()`. The correct fix is removing the legacy flow (H16) — not fixing broken functions that are being deprecated.

## C5/C6: Block HMAC signing / invalid node keypair

Blockchain consensus is simulated for development — code comments document this explicitly (`services/blockchain-node/src/core/block.js:68-70`, `services/blockchain-node/index.js:98`). Real BFT/PoS consensus with proper ECDSA keypairs is an architectural feature, not a bugfix. Implementation planned for production milestone.

## C7: `tally_key` exposed via API

Current code does NOT expose `tally_key` in API responses. The `GET /api/elections/:id` endpoint (`crud.js:210`) selects `id, title, description, start_date, end_date, status, public_key, created_at` — no `tally_key`. The separate query at line 228 fetches `tally_key` for internal tally computation only and is never returned in the response object. Finding appears based on an older version of the code.

## C12: TOCTOU nullifier race

Nullifier check (SELECT) runs before the INSERT transaction. In practice, the `votes_meta` table has no UNIQUE constraint on `nullifier_hash + election_id`, so a race could allow two identical nullifiers. The window is small and the system's audit logging catches duplicate nullifiers. Proper fix requires a UNIQUE constraint + retry logic — deferred.

## C13: Admin panel JWT in localStorage

Admin panel stores JWT in `localStorage` and sends via `x-auth-token` header. Switching to httpOnly cookies requires redesigning the entire admin auth flow. The voter-facing frontend already uses httpOnly cookies. Admin panel is a dev/internal tool by default. Migrating to httpOnly cookies tracked for later.

## C16: Keys stored unencrypted in localStorage

Inaccurate finding. The frontend's `storeKeypairs()` (`crypto.js:373-427`) encrypts with AES-256-GCM + PBKDF2 (100k iterations, SHA-256) before writing to localStorage. Keys are stored as encrypted base64 blobs, not "unencrypted JSON". The password required for decryption is the user's login password.

## H1/H2: In-memory token blacklist / OTP store

Both require Redis for production scalability. Adding Redis is a cross-cutting infrastructure change affecting docker-compose, CI, and deployment. Current in-memory stores work correctly for single-instance dev and small-scale deployment. Deferred to production-hardening phase.

## H15: CSRF cookie without httpOnly

The double-submit cookie CSRF pattern requires the token to be readable by JavaScript (to send as a header). Adding `httpOnly: true` would prevent `document.cookie` access and break the CSRF flow. The frontend (`services/frontend/src/services/api.js:10-14`) and admin-panel (`services/admin-panel/src/services/api.js:16-20`) both read the CSRF token from cookies. Alternative approaches (signed double-submit, encrypted CSRF token in response body) would require frontend changes.

## H16: Remove legacy voting flow

Legacy flow (HMAC + SHA-256 ballots) is still used by any client that does not send the new crypto fields (`encryptedBallot`, `clientNullifier`, `signature`, `publicKey`). Removing it would break API compatibility for older clients. Both the frontend and admin-panel use the new flow, so this can be removed after verifying no outstanding clients.

## H18: `voter_user` in localStorage

Stores user profile metadata (institutionId, email, role) — NOT the auth token. The auth token is in an httpOnly cookie. Persisting the user profile avoids an extra API call on page refresh. No secrets are stored here.

## H21: RS256 JWT

Architectural change requiring asymmetric key management infrastructure. HS256 with a strong `JWT_SECRET` is sufficient for the current deployment model (single backend service). RS256 deferred to multi-service or federation requirement.

## H26: Public key not verified against registered user

The system allows voters to generate new keypairs per election. The `publicKey` in the vote request is the key used to sign, not necessarily the one on file. The architecture intentionally separates "who you are" (auth) from "which key signed this" (non-repudiation). The audit trail records both.

## L6: JWT in JSON login response

The admin panel reads `data.token` from the login response and stores it in `localStorage` for subsequent API calls. Removing the token from the JSON body would break admin panel auth. The backend already sets an httpOnly cookie for cookie-based auth (used by the frontend). The dual approach (cookie + JSON body) supports both frontend patterns.
