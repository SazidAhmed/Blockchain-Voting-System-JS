# Client-Side Cryptography - Visual Architecture

## 🔐 Complete System Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        REGISTRATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

    User fills form                Generate Keys              Store & Submit
    ┌──────────┐                  ┌──────────┐              ┌──────────┐
    │  Name    │                  │ ECDSA    │              │ Public   │
    │  Email   │    ────────>     │ P-256    │  ────────>   │ Keys     │
    │  Student │                  │ Keypair  │              │ To       │
    │  ID      │                  └──────────┘              │ Backend  │
    │  Password│                  ┌──────────┐              └──────────┘
    └──────────┘                  │ RSA-OAEP │                    │
                                  │ 2048-bit │                    │
                                  │ Keypair  │                    v
                                  └──────────┘              ┌──────────┐
                                        │                    │ Private  │
                                        v                    │ Keys     │
                                  Export Keys                │ To       │
                                  (Base64)                   │localStorage│
                                                            └──────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                           LOGIN FLOW                                     │
└─────────────────────────────────────────────────────────────────────────┘

    User Login                  Backend Auth              Load Keys
    ┌──────────┐               ┌──────────┐             ┌──────────┐
    │ Username │               │ Verify   │             │ Retrieve │
    │ Password │  ────────>    │ Creds    │  ────────>  │ From     │
    └──────────┘               │ Return   │             │localStorage│
                               │ JWT      │             └──────────┘
                               └──────────┘                   │
                                                             v
                                                        ┌──────────┐
                                                        │ Import   │
                                                        │ Keys     │
                                                        │ Into     │
                                                        │ Memory   │
                                                        └──────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                          VOTING FLOW                                     │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: Select Candidate
    ┌──────────────────┐
    │   Candidate A    │
    │ ◉ Candidate B    │  <── User Selection
    │   Candidate C    │
    └──────────────────┘
            │
            v
    ┌─────────────────────────────────────────────────────────┐
    │              CRYPTOGRAPHIC OPERATIONS                    │
    └─────────────────────────────────────────────────────────┘

Step 2: Generate Nullifier
    ┌──────────────────┐     ┌──────────────┐
    │ Private Key      │ +   │ Election ID  │
    │ (ECDSA)          │     │              │
    └──────────────────┘     └──────────────┘
            │                       │
            └───────────┬───────────┘
                        v
                ┌──────────────┐
                │  SHA-256     │
                │  Hash        │
                └──────────────┘
                        │
                        v
                ┌──────────────┐
                │  Nullifier   │
                │  (64 hex)    │
                └──────────────┘

Step 3: Encrypt Ballot
    ┌────────────────────┐     ┌──────────────────┐
    │ Ballot Data        │     │ Election Public  │
    │ {                  │     │ Key (RSA)        │
    │   candidateId: 42  │ +   │                  │
    │   timestamp: ...   │     │                  │
    │   electionId: ...  │     │                  │
    │ }                  │     │                  │
    └────────────────────┘     └──────────────────┘
            │                           │
            └─────────┬─────────────────┘
                      v
              ┌──────────────┐
              │  RSA-OAEP    │
              │  Encrypt     │
              └──────────────┘
                      │
                      v
              ┌──────────────┐
              │  Encrypted   │
              │  Ballot      │
              │  (Base64)    │
              └──────────────┘

Step 4: Create Vote Package
    ┌────────────────────────────────────┐
    │ Vote Package                       │
    │ {                                  │
    │   encryptedBallot: "...",          │
    │   nullifier: "a3b4c5...",          │
    │   electionId: "election-123",      │
    │   timestamp: 1234567890            │
    │ }                                  │
    └────────────────────────────────────┘
                      │
                      v
    ┌────────────────────────────────────┐
    │ Sign with Private Key (ECDSA)      │
    └────────────────────────────────────┘
                      │
                      v
    ┌────────────────────────────────────┐
    │ Complete Signed Vote Package       │
    │ {                                  │
    │   encryptedBallot: "...",          │
    │   nullifier: "a3b4c5...",          │
    │   electionId: "election-123",      │
    │   timestamp: 1234567890,           │
    │   signature: "r8s9t0...",          │
    │   publicKey: "ECDSA_PUB..."        │
    │ }                                  │
    └────────────────────────────────────┘

Step 5: Submit to Backend
    ┌────────────────────────────────────┐
    │     POST /api/elections/:id/vote   │
    │                                    │
    │  Headers:                          │
    │    Authorization: Bearer JWT       │
    │                                    │
    │  Body: Signed Vote Package         │
    └────────────────────────────────────┘
                      │
                      v
    ┌────────────────────────────────────┐
    │  Backend Verification              │
    │  ✓ Verify signature                │
    │  ✓ Check nullifier uniqueness      │
    │  ✓ Validate election status        │
    │  ✓ Store encrypted ballot          │
    │  ✓ Broadcast to blockchain         │
    └────────────────────────────────────┘
                      │
                      v
    ┌────────────────────────────────────┐
    │  Return Vote Receipt               │
    │  {                                 │
    │    transactionHash: "tx123...",    │
    │    nullifier: "a3b4c5...",         │
    │    signature: "r8s9t0...",         │
    │    timestamp: 1234567890,          │
    │    blockNumber: 42                 │
    │  }                                 │
    └────────────────────────────────────┘
                      │
                      v
    ┌────────────────────────────────────┐
    │  Display VoteReceipt Component     │
    │                                    │
    │  🎫 Vote Receipt                   │
    │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
    │  Transaction Hash: tx123...        │
    │  Nullifier: a3b4c5...              │
    │  Timestamp: 2025-10-20 14:30:00   │
    │                                    │
    │  [💾 Download] [🖨️ Print]          │
    └────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    KEY STORAGE ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────┘

    Memory (Session)                    Browser Storage
    ┌──────────────┐                   ┌──────────────────┐
    │ keyManager   │                   │  localStorage    │
    │              │                   │                  │
    │ currentKeys: │                   │ voting_keys_123: │
    │ {            │    <──Store───    │ {                │
    │   signing    │    ──Retrieve──>  │   signing: {...} │
    │   encryption │                   │   encryption:{..}│
    │ }            │                   │ }                │
    └──────────────┘                   └──────────────────┘
          │                                     │
          │ On Logout                           │ Persistent
          v                                     │ (needs encryption)
    ┌──────────────┐                           │
    │ Keys Cleared │                           v
    │ Security ✓   │                   ┌──────────────────┐
    └──────────────┘                   │ Production:      │
                                       │ - PBKDF2         │
                                       │ - AES-GCM        │
                                       │ - IndexedDB      │
                                       │ - HSM            │
                                       └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                                      │
└─────────────────────────────────────────────────────────────────────────┘

    Layer 1: Authentication
    ┌────────────────────────────────────┐
    │  Username + Password               │
    │  → JWT Token                       │
    │  → Backend Verification            │
    └────────────────────────────────────┘
                  │
                  v
    Layer 2: Cryptographic Keys
    ┌────────────────────────────────────┐
    │  ECDSA P-256 (Signing)             │
    │  RSA-OAEP 2048 (Encryption)        │
    │  → Client-side Generation          │
    │  → Private Keys Never Leave Client │
    └────────────────────────────────────┘
                  │
                  v
    Layer 3: Ballot Encryption
    ┌────────────────────────────────────┐
    │  RSA Encryption                    │
    │  → Only Election Key Can Decrypt   │
    │  → Server Cannot Read Votes        │
    └────────────────────────────────────┘
                  │
                  v
    Layer 4: Digital Signatures
    ┌────────────────────────────────────┐
    │  ECDSA Signature                   │
    │  → Proves Vote Authenticity        │
    │  → Non-repudiation                 │
    │  → Tamper Detection                │
    └────────────────────────────────────┘
                  │
                  v
    Layer 5: Privacy (Nullifiers)
    ┌────────────────────────────────────┐
    │  SHA-256 Hash                      │
    │  → Deterministic (same voter+elec) │
    │  → Unlinkable to Identity          │
    │  → Prevents Double Voting          │
    └────────────────────────────────────┘
                  │
                  v
    Layer 6: Blockchain
    ┌────────────────────────────────────┐
    │  Immutable Ledger                  │
    │  → Tamper-proof                    │
    │  → Auditable                       │
    │  → Verifiable                      │
    └────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                  DATA FLOW SECURITY                                      │
└─────────────────────────────────────────────────────────────────────────┘

    Plaintext Zone          Encrypted Zone         Backend Zone
    (Client Browser)        (Transmission)         (Server)
    ┌──────────────┐       ┌──────────────┐      ┌──────────────┐
    │ Candidate    │       │ Encrypted    │      │ Encrypted    │
    │ Selection    │  ───> │ Ballot       │ ───> │ Ballot       │
    │              │       │ (RSA)        │      │ (Stored)     │
    │ candidateId: │       │              │      │              │
    │ 42           │       │ XaB9c...     │      │ XaB9c...     │
    └──────────────┘       └──────────────┘      └──────────────┘
         ✓                      ✓                      ✓
    Readable by          Unreadable          Unreadable until
    User Only            by Anyone           Tallying Phase


┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPONENT ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────┐
    │                    Vue.js Frontend                       │
    ├─────────────────────────────────────────────────────────┤
    │                                                          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
    │  │ RegisterView │  │  LoginView   │  │  VoteView    │ │
    │  │              │  │              │  │              │ │
    │  │ • Generate   │  │ • Load Keys  │  │ • Encrypt    │ │
    │  │   Keys       │  │ • Validate   │  │   Ballot     │ │
    │  │ • Store Keys │  │              │  │ • Sign Vote  │ │
    │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
    │         │                 │                  │          │
    │         └─────────────────┼──────────────────┘          │
    │                           │                             │
    │  ┌────────────────────────┴───────────────────────┐    │
    │  │           KeyManager Service                    │    │
    │  │  • initializeUserKeys()                         │    │
    │  │  • loadUserKeys()                               │    │
    │  │  • generateVote()                               │    │
    │  │  • getCurrentKeys()                             │    │
    │  └────────────────────┬───────────────────────────┘    │
    │                       │                                 │
    │  ┌────────────────────┴───────────────────────────┐    │
    │  │           CryptoService                         │    │
    │  │  • generateUserKeypairs()                       │    │
    │  │  • encryptBallot()                              │    │
    │  │  • signData()                                   │    │
    │  │  • verifySignature()                            │    │
    │  │  • generateNullifier()                          │    │
    │  │  • exportPublicKey()                            │    │
    │  └────────────────────┬───────────────────────────┘    │
    │                       │                                 │
    │  ┌────────────────────┴───────────────────────────┐    │
    │  │         Web Crypto API                          │    │
    │  │  • crypto.subtle.generateKey()                  │    │
    │  │  • crypto.subtle.encrypt()                      │    │
    │  │  • crypto.subtle.sign()                         │    │
    │  │  • crypto.subtle.verify()                       │    │
    │  │  • crypto.subtle.digest()                       │    │
    │  └─────────────────────────────────────────────────┘    │
    │                                                          │
    └──────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                 CRYPTOGRAPHIC ALGORITHMS                                 │
└─────────────────────────────────────────────────────────────────────────┘

    Digital Signatures (ECDSA P-256)
    ┌─────────────────────────────────────┐
    │  Input: Message + Private Key       │
    │  Algorithm: ECDSA with SHA-256      │
    │  Curve: P-256 (NIST)                │
    │  Output: 64-byte signature          │
    │  Security: 128-bit                  │
    └─────────────────────────────────────┘

    Encryption (RSA-OAEP)
    ┌─────────────────────────────────────┐
    │  Input: Data + Public Key           │
    │  Algorithm: RSA-OAEP                │
    │  Key Size: 2048 bits                │
    │  Hash: SHA-256                      │
    │  Output: Encrypted ciphertext       │
    │  Security: 112-bit                  │
    └─────────────────────────────────────┘

    Hashing (SHA-256)
    ┌─────────────────────────────────────┐
    │  Input: Any data                    │
    │  Algorithm: SHA-256                 │
    │  Output: 32-byte (256-bit) hash     │
    │  Properties: One-way, collision-res │
    │  Use: Nullifiers, integrity         │
    └─────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      KEY SIZES & SECURITY                                │
└─────────────────────────────────────────────────────────────────────────┘

    ECDSA P-256 Keypair
    ┌──────────────────────────┐
    │ Public Key:   65 bytes   │  → Shareable
    │ Private Key:  32 bytes   │  → Secret
    │ Signature:    64 bytes   │  → Verifiable
    └──────────────────────────┘

    RSA-OAEP 2048 Keypair
    ┌──────────────────────────┐
    │ Public Key:   294 bytes  │  → Shareable
    │ Private Key:  1192 bytes │  → Secret
    │ Ciphertext:   256 bytes  │  → Encrypted
    └──────────────────────────┘

    Storage Requirements
    ┌──────────────────────────┐
    │ Per User:    ~2.5 KB     │
    │ Per Vote:    ~1 KB       │
    │ Per Receipt: ~500 bytes  │
    └──────────────────────────┘


Legend:
  ───>  Data Flow
  ┌─┐   Component/Process
  ✓     Security Check
  { }   JSON Data
```

## 🔐 Security Properties Visualization

```text
┌────────────────────────────────────────────────────────────┐
│                  SECURITY GUARANTEES                        │
└────────────────────────────────────────────────────────────┘

Property: Ballot Secrecy
├─ Encrypted with RSA-OAEP
├─ Only election key can decrypt
├─ Server never sees plaintext
└─ Result: ✓ Vote choice remains secret

Property: Voter Authentication
├─ Digital signature (ECDSA)
├─ Signature verified by backend
├─ Public key matches registered user
└─ Result: ✓ Only authorized voters can vote

Property: Vote Privacy (Unlinkability)
├─ Nullifier derived from private key + election
├─ Server cannot reverse nullifier to identity
├─ Different nullifier per election
└─ Result: ✓ Votes cannot be linked to voters

Property: Double-Vote Prevention
├─ Nullifier is deterministic
├─ Same voter + same election = same nullifier
├─ Backend rejects duplicate nullifiers
└─ Result: ✓ One vote per voter per election

Property: Non-Repudiation
├─ Vote signed with private key
├─ Signature proves voter created vote
├─ Voter cannot deny voting
└─ Result: ✓ Accountability maintained

Property: Coercion Resistance
├─ Receipt doesn't reveal vote choice
├─ Cannot prove to coercer who you voted for
├─ Only proves participation
└─ Result: ✓ Protected from coercion
```

---

**Created:** October 20, 2025  
**Version:** 1.0.0  
**Format:** ASCII Art + Markdown
