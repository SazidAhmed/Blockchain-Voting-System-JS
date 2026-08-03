# Cryptography Implementation

Two layers: client-side (Web Crypto API) for key operations, server-side (Node native `crypto`) for verification.

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

Client-side SHA-256: `SHA-256(privateKey + "||" + electionId)`. Deterministic per voter+election pair. Prevents double-voting without revealing voter identity. Server never derives nullifiers; they are client-supplied and verified for uniqueness.

### Key Storage

Stored in **IndexedDB** under store `voting_keys_{userId}`, encrypted with AES-256-GCM using a random salt (per encryption) + PBKDF2-derived key (100k iterations) from user password. localStorage no longer used for key storage (security improvement).

### Key Manager — `services/frontend/src/services/keyManager.js`

Lifecycle wrapper around `crypto.js`:

- `initializeUserKeys(userId, password)` — generate + store in IndexedDB
- `loadUserKeys(userId, password)` — retrieve from IndexedDB
- `generateVote(voteData, electionId, electionPublicKey)` — creates signed, encrypted vote package
- `exportPrivateKeysForBackup(password)` — base64 export with warnings

## Server-Side — `services/backend/utils/signing.js`

Uses Node native `crypto` module (no `elliptic` dependency).

### ECDSA Verification

`verifyECDSASignature(publicKeyBase64, signatureBase64, data)` — full cryptographic verification:

1. Parses SPKI-encoded public key (DER), extracts P-256 x/y coordinates
2. SHA-256 hashes the data (using canonical JSON: keys sorted)
3. Decodes IEEE P1363-format signature (r || s, 64 bytes for P-256)
4. Verifies ECDSA via native `crypto.createVerify()` with SPKI format

### Backend Token/Hash Utilities

- `generateToken()` — `crypto.randomBytes(32).toString('hex')`
- `hashPassword()` / `comparePassword()` — bcryptjs (12 salt rounds)
- `verifyECDSASignature()` — uses native crypto, canonical JSON

## Transaction Hash

Backend computes deterministic transaction hash: `SHA-256({ electionId, nullifier, encryptedBallot, timestamp })` and returns it as the vote receipt.

Blockchain node computes deterministic hashes:

- **Block hash**: SHA-256 of `index + timestamp + JSON.stringify(data) + previousHash + nonce + merkleRoot`
- **Vote hash**: SHA-256 of `electionId + nullifier + encryptedBallot + timestamp`

## Key Flow

```text
Registration
  → generateSigningKeypair()  (ECDSA P-256)
  → generateEncryptionKeypair()  (RSA-OAEP 2048)
  → export public keys → send to backend
  → store private keys in IndexedDB

Voting
  → generateNullifier(privateKey, electionId)  (SHA-256, client-side)
  → encryptBallot(ballot, electionPublicKey)  (RSA-OAEP)
  → signData(votePackage, privateKey)  (ECDSA P-256)
  → submit { encryptedBallot, nullifier, electionId, timestamp, signature, publicKey }
```

Backend verifies signature via `verifyECDSASignature()` using native `crypto`, checks nullifier uniqueness (UNIQUE constraint), and records vote.
