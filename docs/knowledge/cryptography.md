# Cryptographic Concepts

An academic overview of the cryptographic techniques used in this voting system.

---

## The Two Pillars: Encryption vs Signatures

Cryptography serves two distinct purposes in a voting system:

| Goal                        | Mechanism          | Property                                   |
| --------------------------- | ------------------ | ------------------------------------------ |
| **Keep ballots secret**     | Encryption         | Confidentiality                            |
| **Prove vote authenticity** | Digital signatures | Authentication, integrity, non-repudiation |

This project uses **different algorithms** for each purpose — and that's by design.

---

## Symmetric vs Asymmetric Encryption

| Property         | Symmetric               | Asymmetric                  |
| ---------------- | ----------------------- | --------------------------- |
| **Keys**         | One shared key          | Key pair (public + private) |
| **Speed**        | Fast                    | Slow (~1000x slower)        |
| **Key exchange** | Problem (how to share?) | Public key freely shared    |
| **Use case**     | Bulk data encryption    | Key exchange, signatures    |
| **Examples**     | AES, ChaCha20           | RSA, ECC, Diffie-Hellman    |

Symmetric encryption is faster, but requires both parties to already share a secret key. Asymmetric encryption solves the key distribution problem: anyone can encrypt with your public key, but only your private key can decrypt.

This project uses **asymmetric encryption** exclusively because voters and the system never share a secret key beforehand.

---

## Elliptic Curve Cryptography (ECC)

### What It Is

ECC is an asymmetric cryptosystem based on the algebraic structure of **elliptic curves over finite fields**. The core operation is **scalar multiplication** — adding a point on the curve to itself _n_ times:

```text
Q = n × G
```

Where `G` is a generator point and `n` is a private scalar. Computing `Q` from `n` is easy. Computing `n` from `Q` is the **elliptic curve discrete logarithm problem (ECDLP)** — computationally infeasible for large curves.

### Why P-256?

The project uses the **P-256 curve** (also called secp256r1 or NIST P-256). This is a standardized curve with a 256-bit key size.

| Curve    | Key Size | Security Level | Speed  |
| -------- | -------- | -------------- | ------ |
| P-256    | 256-bit  | ~128-bit       | Fast   |
| RSA-2048 | 2048-bit | ~112-bit       | Slower |
| P-384    | 384-bit  | ~192-bit       | Slower |

P-256 offers comparable security to RSA-2048 with significantly smaller keys and faster operations. It's also a **NIST standard**, meaning it has undergone extensive public scrutiny.

### Key Generation

1. Generate a random 256-bit private key `d`
2. Compute the public key point `Q = d × G` using the curve's generator point
3. The private key is the scalar `d`; the public key is the point `Q`

Both keys are generated **client-side** in the browser using the Web Crypto API — the private key never leaves the voter's device.

---

## ECDSA: Digital Signatures

### What It Is

ECDSA (Elliptic Curve Digital Signature Algorithm) produces **digital signatures** using ECC. It provides three guarantees:

| Property            | Meaning                                                |
| ------------------- | ------------------------------------------------------ |
| **Authentication**  | Only the private key holder could have signed          |
| **Integrity**       | Any modification to the data invalidates the signature |
| **Non-repudiation** | The signer cannot deny having signed                   |

### How Signing Works

```text
Input: message m, private key d

1. Hash the message: h = SHA-256(m)
2. Generate random nonce k
3. Compute point (x₁, y₁) = k × G
4. Compute r = x₁ mod n  (n = curve order)
5. Compute s = k⁻¹ × (h + r × d) mod n
6. Signature = (r, s)
```

### How Verification Works

```text
Input: message m, signature (r, s), public key Q

1. Hash the message: h = SHA-256(m)
2. Compute u₁ = h × s⁻¹ mod n
3. Compute u₂ = r × s⁻¹ mod n
4. Compute point (x₁, y₁) = u₁ × G + u₂ × Q
5. Valid if x₁ mod n == r
```

Verification uses only the public key — anyone can check a signature without accessing the private key.

### In This Project

Every vote is signed client-side with the voter's ECDSA private key. The backend verifies the signature before accepting the vote, ensuring:

- The vote came from a legitimate key pair
- The vote wasn't modified in transit
- The voter cannot later deny having cast the vote

---

## RSA-OAEP: Ballot Encryption

### What It Is

RSA-OAEP (Optimal Asymmetric Encryption Padding) is an asymmetric encryption scheme with **2048-bit keys**. OAEP is a padding scheme that makes RSA semantically secure (indistinguishable under chosen-plaintext attack).

### Why RSA for Encryption?

The project uses **ECDSA for signatures** but **RSA-OAEP for encryption**. Why not use ECC for both?

| Property              | ECDSA / EC-ElGamal | RSA-OAEP            |
| --------------------- | ------------------ | ------------------- |
| Encryption support    | Not natively       | Yes                 |
| Key size for security | 256-bit            | 2048-bit            |
| Signature support     | Excellent          | Possible but larger |
| NIST standardization  | Yes                | Yes                 |
| Ballot encryption fit | Requires hybrid    | Direct              |

RSA provides a straightforward encryption path. ECC excels at signatures but doesn't offer a direct encryption primitive — you'd need EC-ElGamal or a hybrid construction. RSA-OAEP is simpler and well-understood for this use case.

### In This Project

1. During registration, the client generates an RSA-OAEP keypair
2. The public key is sent to the backend and stored
3. When casting a vote, the ballot is encrypted with the election's RSA public key
4. Only the election authority (with the private key) can decrypt ballots for tallying

---

## SHA-256 Hashing

### What It Is

SHA-256 is a **cryptographic hash function** that maps arbitrary-length input to a fixed 256-bit (32-byte) output.

```text
SHA-256("hello")    → 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e7304...
SHA-256("hello!")   → c93f3a0d0a5aa5a37c3e354c4e5c8a0c27e4b5a2d5c3f7a1...
                      (avalanche effect: 1-bit change → ~50% different output)
```

### Properties

| Property                | Definition                                        |
| ----------------------- | ------------------------------------------------- |
| **Deterministic**       | Same input always produces same output            |
| **One-way**             | Cannot reverse hash to find input                 |
| **Collision-resistant** | Extremely hard to find two inputs with same hash  |
| **Avalanche effect**    | Small input change → drastically different output |

### Uses in This Project

SHA-256 serves several critical roles:

#### Nullifiers (Double-Vote Prevention)

```text
nullifier = SHA-256(privateKey || "||" || electionId)
```

The nullifier is a unique, deterministic identifier for each voter-election pair. Because the private key is included, no two voters produce the same nullifier for the same election. The system checks nullifier uniqueness before accepting a vote.

#### Transaction Hashes

```text
txHash = SHA-256({ electionId, nullifier, encryptedBallot, timestamp })
```

This creates a tamper-evident fingerprint of each vote. Changing any field changes the hash, making manipulation detectable.

#### Block Hashes

Each block's hash is `SHA-256(index + timestamp + transactions + previousHash + nonce + merkleRoot)` — linking blocks into an immutable chain.

---

## AES-256-GCM: Tally Encryption

### What It Is

AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode) is a **symmetric authenticated encryption** scheme. It provides both confidentiality (encryption) and authenticity (authentication tag) in a single pass.

| Property           | Value                                          |
| ------------------ | ---------------------------------------------- |
| **Key size**       | 256 bits (32 bytes)                            |
| **IV/nonce size**  | 96 bits (12 bytes)                             |
| **Auth tag size**  | 128 bits (16 bytes)                            |
| **Mode**           | Galois/Counter Mode (authenticated encryption) |
| **Security level** | ~128-bit                                       |

### Why AES-256-GCM for Tally Encryption?

The project uses AES-256-GCM to encrypt vote tallies before they're stored or returned via API. This is separate from ballot encryption (RSA-OAEP) — tally encryption hides real-time vote counts until results are officially released.

| Use Case          | Algorithm   | Why                                                           |
| ----------------- | ----------- | ------------------------------------------------------------- |
| Ballot encryption | RSA-OAEP    | Asymmetric — voter encrypts, only election authority decrypts |
| Vote tally hiding | AES-256-GCM | Symmetric — server encrypts/decrypts with per-election key    |
| Vote signing      | ECDSA P-256 | Asymmetric — voter signs, anyone verifies                     |

### How It Works

1. **Election creation**: Server generates a random 256-bit `tally_key` per election, stored in the `elections` table
2. **Tally computation**: After votes are cast, the server tallies votes per candidate from encrypted ballots
3. **Encryption**: The tally `{ candidateId: count }` is encrypted with AES-256-GCM using the election's `tally_key`
4. **API response**: Until results are released, the API returns `encryptedTally` (base64) instead of plaintext counts
5. **Release**: Admin manually releases results, or auto-release fires after `end_date` passes — `results_released` flips to `TRUE`, and plaintext counts are returned

### Ciphertext Packing

The encrypted tally is packed as a single base64 string:

```text
┌─────────────┬──────────────┬───────────────┐
│ IV (12 B)   │ AuthTag (16 B)│ Ciphertext    │
└─────────────┴──────────────┴───────────────┘
```

- **IV**: Random 12-byte nonce (never reused with same key)
- **AuthTag**: 16-byte GCM authentication tag (detects tampering)
- **Ciphertext**: Encrypted JSON tally

### Code Reference

```text
services/backend/utils/tallyEncryption.js
  encryptTally(tally, keyHex)  → base64 string
  decryptTally(ciphertext, keyHex) → tally object
```

### Security Properties

| Property             | Meaning                                                             |
| -------------------- | ------------------------------------------------------------------- |
| **Confidentiality**  | Tally hidden until key holder releases results                      |
| **Integrity**        | Any modification to ciphertext invalidates decryption (auth tag)    |
| **Authenticity**     | Only someone with the `tally_key` can produce valid ciphertext      |
| **Nonce uniqueness** | Random 12-byte IV ensures same tally encrypts differently each time |

---

## Key Pairs: The Mental Model

```text
┌─────────────────────────────────────────────────────────┐
│                   VOTER'S KEY PAIRS                     │
│                                                         │
│  ECDSA P-256          RSA-OAEP 2048-bit                 │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │ Private key  │     │ Private key  │                  │
│  │ (stored in   │     │ (stored in   │                  │
│  │  localStorage│     │  localStorage│                  │
│  │  encrypted)  │     │  encrypted)  │                  │
│  └──────┬───────┘     └──────┬───────┘                  │
│         │ sign               │ decrypt                   │
│         ▼                    ▼                           │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │ Public key   │     │ Public key   │                  │
│  │ (on backend) │     │ (on backend) │                  │
│  └──────────────┘     └──────────────┘                  │
│  verify                  encrypt                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  SERVER-SIDE KEYS                        │
│                                                         │
│  AES-256-GCM (per election)                             │
│  ┌──────────────┐                                       │
│  │ tally_key    │  Random 256-bit key per election      │
│  │ (in DB)      │  Encrypts vote tallies until release  │
│  └──────┬───────┘                                       │
│         │ encrypt/decrypt                               │
│         ▼                                               │
│  ┌──────────────┐                                       │
│  │ encrypted    │  Base64-packed ciphertext returned     │
│  │ tally        │  via API until admin releases results │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

- **Private keys**: Secret, stored encrypted in the browser's `localStorage`, never sent to the server
- **Public keys**: Shared with the backend during registration, used for verification and encryption

---

## Nullifiers: Preventing Double Votes

Nullifiers are the system's primary defense against double voting. A nullifier is:

```text
nullifier = SHA-256(privateKey || "||" || electionId)
```

Key properties:

- **Unique per voter per election**: Different private keys → different nullifiers
- **Deterministic**: Same voter always produces the same nullifier for the same election
- **Non-reversible**: Cannot extract the private key from the nullifier
- **Anonymous**: The nullifier reveals nothing about the voter's identity — only that this particular private key has voted in this election

The backend maintains a `nullifiers` table. Before accepting a vote, it checks whether the nullifier already exists. If it does, the vote is rejected as a double-vote attempt.

---

## Deterministic Transaction Hashing

Each vote produces a deterministic transaction hash:

```text
txHash = SHA-256(JSON.stringify({ electionId, nullifier, encryptedBallot, timestamp }))
```

Because all inputs are fixed (the encrypted ballot is ciphertext, which is deterministic given the same plaintext and public key), the same vote always produces the same hash. This ensures:

- **Idempotency**: Resubmitting the same vote doesn't create duplicate records
- **Auditability**: The hash is a stable reference for vote verification
- **Chain integrity**: The hash feeds into the Merkle tree and block hash

---

## Further Reading

- [Cryptographic Architecture](../architecture/crypto.md) — implementation details, code references, key management flow
- [Blockchain Fundamentals](./blockchain.md) — how cryptography secures the chain
- [Security Concepts](./security.md) — threat model and cryptographic protections
- [E-Voting Concepts](./voting-system.md) — how crypto enables ballot secrecy
