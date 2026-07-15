# E-Voting Concepts

An academic overview of electronic voting principles and how this system implements them.

---

## What Is E-Voting?

E-voting (electronic voting) is the use of technology to facilitate all or part of an election process — from voter registration to ballot casting to tallying. Compared to traditional paper voting:

| Property             | Paper Voting                  | E-Voting                            |
| -------------------- | ----------------------------- | ----------------------------------- |
| **Speed**            | Days to count                 | Near-instant tallying               |
| **Accessibility**    | Physical polling station      | Remote participation                |
| **Cost**             | Printing, staffing, logistics | Infrastructure, development         |
| **Auditability**     | Physical ballot trail         | Cryptographic verification          |
| **Scalability**      | Limited by venue capacity     | Scales with network bandwidth       |
| **Voter fraud risk** | Physical ID checks            | Cryptographic identity verification |

E-voting introduces new challenges: how do you verify a vote was counted correctly without revealing how someone voted? How do you prevent coercion in remote settings? This system addresses these through layered cryptographic design.

---

## Ballot Secrecy

Ballot secrecy — ensuring no one can determine how a voter voted — is a fundamental requirement. This system protects ballot secrecy through **client-side encryption**.

### How It Works

```text
Voter's device                Network                 Blockchain
┌──────────────┐           ┌────────┐             ┌────────────┐
│  plaintext   │           │        │             │            │
│  ballot      │           │        │             │            │
│  {candidate} │──RSA─────▶│cipher- │──record───▶│encrypted   │
│              │  encrypt  │text    │             │ballot      │
└──────────────┘           └────────┘             └────────────┘
                                 │
                          never decrypted
                          in transit or at
                          rest on server
```

1. Voter selects a candidate (plaintext ballot)
2. Browser encrypts ballot with RSA-OAEP using the election's public key
3. Only ciphertext is transmitted and stored
4. The server **never sees** the plaintext ballot
5. Only the election authority, with the RSA private key, can decrypt for tallying

This means even a compromised server or blockchain node cannot learn how anyone voted.

---

## Voter Eligibility

Not everyone should be able to vote. The system enforces eligibility through a multi-step registration process:

### Registration Flow

```text
┌────────────┐    ┌──────────────┐    ┌────────────┐    ┌──────────┐
│  User signs │───▶│  Institution │───▶│  OTP email │───▶│  Keys    │
│  up         │    │  verifies    │    │  sent      │    │  generated│
└────────────┘    │  identity    │    │  verified  │    └──────────┘
                  └──────────────┘    └────────────┘
```

1. **Account creation**: User provides credentials (username, email, password)
2. **Institution verification**: Backend calls the Institution API to verify the user is a legitimate student/staff member
3. **OTP verification**: A one-time password is sent to the verified email address
4. **Key generation**: Upon successful verification, ECDSA and RSA keypairs are generated client-side

### Blind Tokens

After verification, the system issues a **blind token** — a cryptographic credential that proves eligibility without revealing identity:

```text
institution verifies identity → issues blind token
blind token links to nullifier → enables voting without identity exposure
```

The blind token connects the voter's eligibility (verified identity) to their on-chain pseudonym (nullifier) without creating a traceable link between the two.

---

## Election Lifecycle

Elections progress through defined states with clear transitions:

```text
┌───────┐    ┌─────────┐    ┌────────┐    ┌──────────┐
│ DRAFT │───▶│ PENDING │───▶│ ACTIVE │───▶│ COMPLETED│
└───────┘    └─────────┘    └────────┘    └──────────┘
  admin        waiting for    votes         voting
  creates      start time     accepted      period ended
```

| State         | What Happens                                         |
| ------------- | ---------------------------------------------------- |
| **Draft**     | Admin creates election, adds candidates, sets dates  |
| **Pending**   | Election is configured but voting hasn't started yet |
| **Active**    | Votes are accepted; real-time results available      |
| **Completed** | Voting period ended; final tally computed            |

### Election Locking

Once an election reaches **completed** state, it becomes **immutable**:

- No votes can be added or removed
- Election parameters cannot be modified
- Results are final and cryptographically verifiable
- The blockchain record provides permanent, tamper-proof proof of the outcome

This immutability is enforced at multiple levels: the backend rejects writes to completed elections, and the blockchain's hash chaining prevents retroactive modification.

---

## Vote Casting: The Complete Flow

Here's the full journey of a single vote:

```text
Step 1: CLIENT SIDE
  ┌─────────────────────────────────────────┐
  │  Voter selects candidate                 │
  │  Browser generates nullifier             │
  │  Browser encrypts ballot (RSA-OAEP)      │
  │  Browser signs encrypted ballot (ECDSA)  │
  │  Browser creates vote package            │
  └─────────────────────┬───────────────────┘
                        │
Step 2: SUBMISSION      │
  ┌─────────────────────▼───────────────────┐
  │  POST /api/elections/:id/vote           │
  │  { encryptedBallot, nullifier, sig, ... }│
  └─────────────────────┬───────────────────┘
                        │
Step 3: BACKEND VERIFICATION
  ┌─────────────────────▼───────────────────┐
  │  Verify ECDSA signature                  │
  │  Check nullifier uniqueness              │
  │  Validate election is active             │
  │  Check voter eligibility                 │
  │  Rate limit check                        │
  └─────────────────────┬───────────────────┘
                        │
Step 4: BLOCKCHAIN RECORDING
  ┌─────────────────────▼───────────────────┐
  │  Vote submitted to blockchain node       │
  │  Node mines new block (PoW)              │
  │  Block broadcast to peers                │
  │  Consensus reached                       │
  │  Merkle root computed                    │
  └─────────────────────┬───────────────────┘
                        │
Step 5: CONFIRMATION
  ┌─────────────────────▼───────────────────┐
  │  Transaction hash returned to voter      │
  │  Voter can verify via Merkle proof       │
  └─────────────────────────────────────────┘
```

---

## Vote Verification

Voters can verify their vote was recorded correctly without trusting any single authority.

### Merkle Proofs

After voting, the voter receives a **transaction hash**. They can request a **Merkle proof** — a set of sibling hashes that, when combined, reproduce the Merkle root stored in the block.

```text
              Block's merkleRoot
             /                  \
        Hash(AB)              Hash(CD)
        /      \             /      \
   Hash(A)   Hash(B)   Hash(C)   Hash(D)
     |         |         |         |
   Tx A      Tx B      Tx C      Tx D
                      ↑
              your vote (Tx C)

Merkle proof: [Hash(D), Hash(AB)]
Recompute: Hash(Hash(C) || Hash(D)) → Hash(CD)
           Hash(Hash(AB) || Hash(CD)) → merkleRoot ✓
```

If the recomputed root matches the block's `merkleRoot`, the vote is confirmed as included and untampered.

### Blockchain Explorer

The system provides a blockchain explorer interface where anyone can:

- View all blocks and their transactions
- Verify block hashes and PoW
- Trace the chain from any block back to genesis
- Confirm Merkle roots match their transactions

---

## Blind Tokens and Pseudonym Identity

### The Problem

Traditional voting systems link identity to ballot — you sign a roster, then cast a vote. Remote e-voting breaks this link, creating two problems:

1. **How do you prove eligibility without revealing identity?**
2. **How do you prevent someone from proving how they voted (vote selling)?**

### The Solution: Blind Tokens

```text
Registration Phase:
  identity verified → institution issues blind token → token stored locally

Voting Phase:
  blind token → proves eligibility to backend
  nullifier   → pseudonymous identifier on blockchain
  no link     → backend cannot connect nullifier to real identity
```

The blind token proves "this voter is eligible" without revealing "this specific voter." The backend checks token validity without learning the voter's identity.

---

## Receipt-Free Voting

**Receipt-free voting** means voters cannot prove to a third party how they voted. This prevents:

- **Vote selling**: A buyer cannot verify the voter actually voted for the promised candidate
- **Coercion**: A coercer cannot confirm compliance

This system achieves receipt-free properties through:

1. **Client-side encryption**: The plaintext ballot never leaves the voter's device in a form others can intercept
2. **No receipt issuance**: The system returns a transaction hash, not a proof of which candidate was selected
3. **Deterministic encryption**: The encrypted ballot is deterministic, but without the private key, it's meaningless ciphertext

A transaction hash proves "a vote was recorded" but not "which candidate was chosen."

---

## Auto-Registration

The system supports automatic voter registration for eligible institutional members:

1. Institution API provides a directory of eligible voters (students, staff)
2. When a user creates an account with a verified institutional email, they are automatically eligible
3. Key generation happens immediately — no manual approval step
4. The voter can cast ballots in any active election they're eligible for

This reduces friction while maintaining eligibility verification through the institution's existing identity management.

---

## Further Reading

- [Backend API — Voting Flow](../api/backend.md) — API endpoints and request/response formats
- [Cryptographic Concepts](./cryptography.md) — how encryption and signatures enable ballot secrecy
- [Blockchain Fundamentals](./blockchain.md) — how votes are recorded immutably
- [Security Concepts](./security.md) — threat model for the voting system
- [Institution API](../api/institution-api.md) — voter registration and identity verification
