# Cryptographic Primitives

## Key Types

| Purpose            | Algorithm   | Key Size | Usages           |
| ------------------ | ----------- | -------- | ---------------- |
| Digital signatures | ECDSA P-256 | 256-bit  | sign, verify     |
| Ballot encryption  | RSA-OAEP    | 2048-bit | encrypt, decrypt |

Both keypairs are generated client-side in the browser via **Web Crypto API** (`window.crypto.subtle`).

ECDSA uses P-256 (secp256r1) curve. RSA-OAEP uses SHA-256 as hash function with exponent `0x10001`.

## Flow

### Registration

`KeyManager.initializeUserKeys()` in `services/frontend/src/services/keyManager.js:25`:

1. Generate ECDSA P-256 signing keypair (via `CryptoService.generateSigningKeypair()`)
2. Generate RSA-OAEP encryption keypair (via `CryptoService.generateEncryptionKeypair()`)
3. Export public keys as SPKI base64 → send to backend
4. Export private keys as PKCS8 base64 → encrypt and store in `localStorage` (key: `voting_keys_{userId}`)

### Voting

`CryptoService.createVotePackage()` in `services/frontend/src/services/crypto.js:435`:

1. Generate nullifier (SHA-256 of `privateKey || "||" || electionId`)
2. Create ballot `{candidateId, timestamp, electionId}`
3. Encrypt ballot with election's RSA public key via RSA-OAEP
4. Build vote package `{encryptedBallot, nullifier, electionId, timestamp}`
5. Sign package with ECDSA private key
6. Submit to backend `{votePackage, signature, publicKey}`

### Backend Verification

`services/backend/utils/crypto.js:73` — `verifyECDSASignature()`:

1. Parse SPKI public key DER → extract P-256 x,y coordinates
2. Hash signed data with SHA-256
3. Decode signature from IEEE P1363 format (r||s, 32 bytes each)
4. Verify using `elliptic` library (`ec.keyFromPublic().verify()`)

## Nullifiers

Nullifiers prevent double-voting without revealing voter identity.

**Generation** (`crypto.js:307-330`):

```javascript
SHA - 256(privateKey + "||" + electionId);
```

Deterministic per voter+election — same voter always produces the same nullifier for a given election. Different elections produce different nullifiers. The hash is one-way: given a nullifier, no one can determine the voter.

Server rejects duplicate nullifiers at both chain level (`Blockchain.isNullifierUsed()`) and vote submission.

## Blind-Signed Eligibility Tokens

The system supports blind signatures for privacy-preserving voter authentication. During registration, the voter's client generates a random token, blinds it (hides it from the server), and sends the blinded token to the backend. The backend signs the blinded token without seeing its content, then returns the blind signature. The voter unblinds locally, yielding a valid signature on a token the server never saw.

**Flow:**

1. Client generates random token, computes blinding factor
2. Client sends blinded token + pseudonym_id to `POST /api/elections/:id/blind-sign`
3. Server verifies voter eligibility, signs blinded token, stores `token_id_hash` (SHA-256 of unblinded token) in `blind_tokens` table
4. Client unblinds signature, stores token locally
5. To vote, client presents token + signature — server verifies signature against stored hash without learning the token itself

**Key properties:**

- Server cannot link token to voter (blind signature property)
- Double-vote prevention via `token_id_hash` uniqueness
- Tokens are per-election, revocable via `revoked` flag
- Schema: `blind_tokens` table (see [schema.md](../database/schema.md))

## Client-Side Key Manager

`KeyManager` (`services/frontend/src/services/keyManager.js`) manages the full key lifecycle:

| Method                                                  | Purpose                                                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `initializeUserKeys(userId, password)`                  | Generate ECDSA + RSA keypairs, export public keys for server, encrypt and store private keys in `localStorage` |
| `loadUserKeys(userId, password)`                        | Retrieve and re-import stored keypairs into memory                                                             |
| `getCurrentKeys()`                                      | Return in-memory keys (null if not loaded)                                                                     |
| `clearKeys()`                                           | Wipe keys from memory (on logout)                                                                              |
| `exportPrivateKeysForBackup(password)`                  | Export both keypairs as base64 with security warning                                                           |
| `importKeysFromBackup(exportedKeys, userId, password)`  | Re-import keys from backup, store, and load into memory                                                        |
| `hasStoredKeys(userId)`                                 | Check if `localStorage` has keys for user                                                                      |
| `validateKeys()`                                        | Sign-then-verify test data to confirm key integrity                                                            |
| `generateVote(voteData, electionId, electionPublicKey)` | Create encrypted, signed vote package via `CryptoService`                                                      |
| `generateNullifierForElection(electionId)`              | Derive nullifier from signing private key + election ID                                                        |

Keys are held in memory as `CryptoKey` objects for the session lifetime. `clearKeys()` must be called on logout to prevent stale key access.

## Key Storage

**Current (development):** localStorage, JSON-serialized, no encryption. See `crypto.js:364-390`.

**Production recommendation:** PBKDF2-derived key from password → AES-256-GCM encrypt private keys → store in IndexedDB. Hardware Security Module (HSM) or WebAuthn for key access.

## Transaction Hash

Server computes deterministic transaction hash on vote submission (see [blockchain.md](blockchain.md) → Transaction Structure):

```javascript
SHA - 256({ electionId, nullifier, encryptedBallot, timestamp });
```

Hash is returned as receipt. Voter can later prove their vote was included (via Merkle proof) without revealing ballot contents.

## Voting Receipt

`POST /vote` response includes:

```json
{
  "receipt": {
    "transactionHash": "<SHA-256 hex>",
    "nullifier": "<SHA-256 hex>",
    "timestamp": 1763026068827,
    "blockIndex": 4
  }
}
```

Receipt proves participation, not choice — coercion resistant.

## Legacy Server-Side Crypto

`services/backend/utils/crypto.js` contains fallback functions (`generateKeypair`, `signData`, `verifySignature`) using HMAC-SHA256 simulation. These exist for backward compatibility; all new usage goes through client-side Web Crypto API.

## Further Reading

- [Frontend Crypto](../development/crypto-implementation.md) — browser usage, key manager, test scripts
- [Threat Model](../security/threat-model.md) — attack surfaces, mitigations, trust boundaries
- [Security Operations](../security/operations.md) — monitoring, incident response
- [Audit Trail](../security/audit.md) — logging, integrity verification
- **New to cryptography?** See the [Knowledge Base](../knowledge/cryptography.md) for academic explanation of ECC, RSA, hashing, and digital signatures
