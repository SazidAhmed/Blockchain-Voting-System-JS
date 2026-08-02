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
4. Export private keys as PKCS8 base64 → encrypt with AES-256-GCM using random salt and store in **IndexedDB** (key: `voting_keys_{userId}`)

### Voting

`CryptoService.createVotePackage()` in `services/frontend/src/services/crypto.js:435`:

1. Generate nullifier (SHA-256 of `privateKey || "||" || electionId`)
2. Create ballot `{candidateId, timestamp, electionId}`
3. Encrypt ballot with election's RSA public key via RSA-OAEP
4. Build vote package `{encryptedBallot, nullifier, electionId, timestamp}`
5. Sign package with ECDSA private key
6. Submit to backend `{votePackage, signature, publicKey}`

### Backend Verification

`services/backend/utils/signing.js` — `verifyECDSASignature()` and `services/blockchain-node/src/core/signature.js`:

1. **Canonical JSON serialization** — Sort object keys before signing/verifying to prevent key-order mismatches (H-03)
2. Parse SPKI public key via native `crypto.createPublicKey()`
3. Verify signature using `crypto.verify()` with SPKI format and SHA-256 digest

**Canonical JSON** (`signature.js:canonicalJson`): Recursively sorts all object keys alphabetically before stringification. Ensures identical serialization across client and server.

## Blockchain Node Keys

**Persistent ECDSA keypairs** (`blockchain-node/src/core/blockchain.js:getOrCreateNodeKey`):

Each blockchain node generates an ECDSA P-256 keypair on first boot and **persists it to LevelDB** (key: `node_key`). On subsequent restarts, the same key is loaded. This ensures:

- **Stable validator identity** — node ID remains consistent across restarts (C-02)
- **Block signature continuity** — blocks signed by a node can always be attributed to the same validator
- **Peer authentication** — nodes identify each other via their persistent public keys (H-29)

Keypairs are never regenerated. If the LevelDB volume is destroyed, a new identity is created.

## Nullifiers

Nullifiers prevent double-voting without revealing voter identity.

**Generation** (`crypto.js:364-387`):

Client-side nullifier derivation using SHA-256:

```javascript
SHA-256(privateKey + "||" + electionId)
```

Deterministic per voter+election — same voter always produces the same nullifier for a given election. Different elections produce different nullifiers. The hash is one-way: given a nullifier, no one can determine the voter.

Server rejects duplicate nullifiers at both chain level (`Blockchain.isNullifierUsed()`) and vote submission via database unique constraint on `nullifier_hash`.

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

| Method                                                  | Purpose                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `initializeUserKeys(userId, password)`                  | Generate ECDSA + RSA keypairs, export public keys for server, encrypt and store private keys in **IndexedDB** |
| `loadUserKeys(userId, password)`                        | Retrieve and re-import stored keypairs from IndexedDB into memory                                             |
| `getCurrentKeys()`                                      | Return in-memory keys (null if not loaded)                                                                    |
| `clearKeys()`                                           | Wipe keys from memory (on logout)                                                                             |
| `exportPrivateKeysForBackup(password)`                  | Export both keypairs as base64 with security warning                                                          |
| `importKeysFromBackup(exportedKeys, userId, password)`  | Re-import keys from backup, store in IndexedDB, and load into memory                                          |
| `hasStoredKeys(userId)`                                 | Check if IndexedDB has keys for user                                                                          |
| `validateKeys()`                                        | Sign-then-verify test data to confirm key integrity                                                           |
| `generateVote(voteData, electionId, electionPublicKey)` | Create encrypted, signed vote package via `CryptoService`                                                     |
| `generateNullifierForElection(electionId)`              | Derive nullifier from client-side secret + election ID                                                        |

Keys are held in memory as `CryptoKey` objects for the session lifetime. `clearKeys()` must be called on logout to prevent stale key access.

## Key Storage

**Current:** IndexedDB with random salt per encryption + PBKDF2-derived key from password → AES-256-GCM encrypt private keys. See `crypto.js:373-427`. localStorage no longer used for key storage (security improvement).

**Production recommendation:** Hardware Security Module (HSM) or WebAuthn for key access.

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
    "receiptId": "<opaque-short-id>",
    "transactionHash": "<SHA-256 hex>",
    "timestamp": 1763026068827,
    "blockIndex": 4
  }
}
```

The nullifier is **never exposed** to the client — only an opaque receipt ID is returned. This prevents anyone with the receipt from querying the blockchain to confirm voter participation. Receipt proves participation, not choice — coercion resistant.

## Further Reading

- [Frontend Crypto](../development/crypto-implementation.md) — browser usage, key manager, test scripts
- [Threat Model](../security/threat-model.md) — attack surfaces, mitigations, trust boundaries
- [Security Operations](../security/operations.md) — monitoring, incident response
- [Audit Trail](../security/audit.md) — logging, integrity verification
- **New to cryptography?** See the [Knowledge Base](../knowledge/cryptography.md) for academic explanation of ECC, RSA, hashing, and digital signatures
