# Cryptography Implementation

Two layers: client-side (Web Crypto API) for key operations, server-side (Node `crypto` + `elliptic`) for verification.

## Client-Side — `services/frontend/src/services/crypto.js`

Uses browser Web Crypto API (`window.crypto.subtle`).

### Key Generation

| Algorithm | Curve/Length | Usage                | Purpose                |
| --------- | ------------ | -------------------- | ---------------------- |
| ECDSA     | P-256        | `sign`, `verify`     | Vote authentication    |
| RSA-OAEP  | 2048-bit     | `encrypt`, `decrypt` | Ballot confidentiality |

Keys generated during user registration via `generateUserKeypairs()`.

### Digital Signatures

- `signData(data, privateKey)` — SHA-256 hash + ECDSA P-256 signature, output as base64
- `verifySignature(signature, data, publicKey)` — returns boolean

### Ballot Encryption

- `encryptBallot(ballotData, electionPublicKey)` — RSA-OAEP 2048-bit encryption of JSON-serialized ballot
- Output: base64-encoded ciphertext

### Nullifier Generation

SHA-256 of `privateKeyData + '||' + electionId`. Deterministic per voter+election pair. Prevents double-voting without revealing voter identity.

### Key Storage

Stored in `localStorage` under key `voting_keys_{userId}`, encrypted with AES-256-GCM using a PBKDF2-derived key (100k iterations) from user password.

### Key Manager — `services/frontend/src/services/keyManager.js`

Lifecycle wrapper around `crypto.js`:

- `initializeUserKeys(userId, password)` — generate + store
- `loadUserKeys(userId, password)` — retrieve from localStorage
- `generateVote(voteData, electionId, electionPublicKey)` — creates signed, encrypted vote package
- `exportPrivateKeysForBackup(password)` — base64 export with warnings

## Server-Side — `services/backend/utils/signing.js`

Uses Node `crypto` module, `elliptic` library (P-256), and `bcryptjs`.

### ECDSA Verification

`verifyECDSASignature(publicKeyBase64, signatureBase64, data)` — full cryptographic verification:

1. Parses SPKI-encoded public key (DER), extracts P-256 x/y coordinates
2. SHA-256 hashes the data
3. Decodes IEEE P1363-format signature (r || s, 64 bytes for P-256)
4. Verifies ECDSA via `elliptic` library

### Legacy Functions

| Function            | Method                                    | Status                    |
| ------------------- | ----------------------------------------- | ------------------------- |
| `generateKeypair`   | Random hex strings                        | Legacy                    |
| `signData`          | HMAC-SHA256                               | Legacy                    |
| `verifySignature`   | HMAC-SHA256 comparison                    | Legacy                    |
| `encryptBallot`     | SHA-256 hash                              | Legacy                    |
| `generateNullifier` | SHA-256(userId + electionId + privateKey) | Active (legacy flow only) |

### Backend Hash Utilities

- `generateToken()` — `crypto.randomBytes(32).toString('hex')`
- `hashPassword()` / `comparePassword()` — bcryptjs (10 salt rounds)

## Transaction Hash

Backend stores the blockchain node's deterministic transaction hash when available, falling back to a random hash: `receipt.transactionHash || crypto.randomBytes(32).toString('hex')` in `votes_meta.tx_hash`.

Blockchain node computes deterministic hashes:

- **Block hash**: SHA-256 of `index + timestamp + JSON.stringify(data) + previousHash + nonce + merkleRoot`
- **Vote hash**: SHA-256 of `voterId + electionId + encryptedBallot + nullifier` (note: `verifyVoteSignature()` in `blockchain.js` is a simulation that always returns true)

## Key Flow

```text
Registration
  → generateSigningKeypair()  (ECDSA P-256)
  → generateEncryptionKeypair()  (RSA-OAEP 2048)
  → export public keys → send to backend
  → store private keys in localStorage

Voting
  → generateNullifier(privateKey, electionId)  (SHA-256)
  → encryptBallot(ballot, electionPublicKey)  (RSA-OAEP)
  → signData(votePackage, privateKey)  (ECDSA P-256)
  → submit { encryptedBallot, nullifier, electionId, timestamp, signature, publicKey }
```

Backend verifies signature via `verifyECDSASignature()` using the `elliptic` library, checks nullifier uniqueness, and records vote.
