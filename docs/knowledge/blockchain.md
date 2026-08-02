# Blockchain Fundamentals

An academic overview of blockchain technology and how this voting system implements it.

---

## What Is a Blockchain?

A blockchain is a **distributed ledger** — a database replicated across multiple nodes where no single authority controls the records. Data is stored in **blocks**, each containing a batch of transactions. Blocks are linked together using cryptographic hashes, forming a **chain**:

```text
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Block 0    │    │  Block 1    │    │  Block 2    │
│  (genesis)  │───▶│  prev: h0   │───▶│  prev: h1   │
│  prev: 0    │    │  hash: h1   │    │  hash: h2   │
│  hash: h0   │    │  nonce: 42  │    │  nonce: 187 │
│  txs: [...] │    │  txs: [...] │    │  txs: [...] │
└─────────────┘    └─────────────┘    └─────────────┘
```

Each block's hash is computed from its contents _plus_ the previous block's hash. Changing any data in block N invalidates every block after it — making tampering immediately detectable.

### Key Properties

| Property             | Definition                                              |
| -------------------- | ------------------------------------------------------- |
| **Immutability**     | Once recorded, data cannot be altered without detection |
| **Decentralization** | No single point of control or failure                   |
| **Transparency**     | All participants can verify the ledger state            |
| **Consensus**        | Nodes agree on which blocks are valid                   |

---

## How This Project Implements Blockchain

This system uses a **custom Proof-of-Work blockchain** with 4 peer nodes, purpose-built for vote recording rather than general-purpose transactions.

### Block Structure

Each block contains:

| Field          | Type    | Description                                        |
| -------------- | ------- | -------------------------------------------------- |
| `index`        | integer | Sequential block number                            |
| `timestamp`    | integer | Unix milliseconds when block was created           |
| `transactions` | array   | List of vote transactions in this block            |
| `previousHash` | string  | SHA-256 hash of the previous block's header        |
| `hash`         | string  | SHA-256 hash of this block's header                |
| `nonce`        | integer | Counter incremented during mining                  |
| `merkleRoot`   | string  | Merkle tree root of all transactions in this block |

The block hash is deterministic: `SHA-256(index + timestamp + transactions + previousHash + nonce + merkleRoot)`.

### Mining: Proof-of-Work

Mining means finding a `nonce` that produces a hash meeting a **difficulty target** — in this case, a hash with a required number of leading zeros.

```text
difficulty 4:  hash must start with "0000..."
nonce = 0  →  3a7f...  ✗
nonce = 1  →  8b2c...  ✗
...
nonce = 14832  →  0000b8e1...  ✓
```

The node increments the nonce repeatedly until a valid hash is found. This is computationally expensive (by design) but trivial to verify — anyone can recompute the hash and check.

**Difficulty** adjusts dynamically. The system targets a consistent block creation rate by raising difficulty when blocks come too fast and lowering it when they're slow.

### LevelDB Persistence

Each blockchain node stores its chain in **LevelDB** — a fast key-value store optimized for read-heavy workloads. Data lives at `./data/{nodeId}` per node. LevelDB gives:

- Fast sequential writes (new blocks append quickly)
- Reliable crash recovery (WAL-backed persistence)
- Simple key-value access patterns matching blockchain lookups

**Validator keypairs are also persisted** — each node generates an ECDSA P-256 keypair on first boot and stores it in LevelDB under key `node_key`. On restart, the same key is loaded, ensuring stable validator identity across restarts.

---

## Peer Network

The 4 blockchain nodes communicate via **Socket.IO** for real-time P2P messaging.

### Peer Discovery

Nodes discover each other through the `PEERS` environment variable — a comma-separated list of sibling node URLs. Connections stagger by 2 seconds to avoid a thundering-herd scenario where all nodes attempt simultaneous handshakes.

### Chain Synchronization

When a new node joins or a node recovers from downtime, it must sync with the current chain state. The system uses a **phased recovery protocol**:

```text
Phase 1: DETECT    → Node discovers it's behind peers
Phase 2: RECOVER   → Requests missing blocks from longest valid chain
Phase 3: VALIDATE  → Verifies each received block (hash, PoW, signatures)
Phase 4: COMPLETE  → Node resumes normal operation with updated chain
```

This phased approach prevents accepting corrupted or partially-reconstructed chains.

### Peer Health Monitoring

`PeerManager` tracks each peer's status:

- **Heartbeat**: Regular ping/pong to confirm liveness
- **Health scoring**: Behavioral tracking over time
- **Quarantine**: Nodes exhibiting suspicious behavior (invalid blocks, hash manipulation) are isolated before they can corrupt the chain

**Peer authentication (H-29):** Socket.IO connections require token authentication. Peers must present the correct `BLOCKCHAIN_API_KEY` during the handshake. Unauthorized connections are rejected at the transport level, preventing rogue nodes from broadcasting messages.

---

## Byzantine Fault Tolerance

A **Byzantine fault** is any failure where a node behaves arbitrarily — it might lie, send conflicting data, or actively try to subvert consensus. The system tolerates Byzantine faults as long as fewer than ⅓ of nodes are malicious.

### The 67% Threshold

With 4 nodes, the system can tolerate **1 Byzantine node** (25%). If 2 or more nodes behave maliciously (50%+), the system cannot guarantee correctness. This is the classic Byzantine Fault Tolerance bound:

```text
Total nodes:  4
Tolerated:    1  (25% — below 33% threshold)
Required honest: 3  (75% — above 67% threshold)
```

### Behavior Tracking

Nodes earn trust scores based on:

- Block validity (correct hashes, valid PoW)
- Consistency with peer chains
- Response time and reliability

Nodes falling below trust thresholds are quarantined and excluded from consensus until they demonstrate valid behavior.

---

## Merkle Trees

A Merkle tree is a hash-based data structure that allows efficient verification of data integrity.

### Structure

```text
              Root (merkleRoot)
             /                  \
        Hash(AB)              Hash(CD)
        /      \             /      \
   Hash(A)   Hash(B)   Hash(C)   Hash(D)
     |         |         |         |
   Tx A      Tx B      Tx C      Tx D
```

Each leaf is a hash of a transaction. Each internal node is the hash of its two children. The root compactly represents all transactions.

### Why It Matters for Voting

- **Inclusion proof**: Prove a specific vote is in a block without revealing other votes — you only need log₂(n) hashes (the "sibling" path to the root)
- **Tamper detection**: Changing any transaction changes the Merkle root, which changes the block hash
- **Efficiency**: Verify a vote in O(log n) time instead of rehashing all transactions

### Vote Verification Flow

1. Voter receives a receipt containing their transaction hash
2. Verifier requests the Merkle proof (sibling hashes along the path)
3. Verifier recomputes the root from the leaf up
4. If computed root matches the block's `merkleRoot`, the vote is confirmed as recorded and untampered

---

## Canonical JSON Serialization

All data signed or verified (votes, blocks) uses **canonical JSON** — object keys sorted alphabetically before stringification. This ensures:

- **Deterministic serialization**: Same data → same string, regardless of key order
- **Cross-platform compatibility**: Client and server produce identical JSON strings
- **Signature reliability**: Signatures verified on one platform work on another

Without canonicalization, `{"a": 1, "b": 2}` and `{"b": 2, "a": 1}` would produce different hashes and signatures, even though they represent the same data. The `canonicalJson()` function in `signature.js` recursively sorts keys before serialization.

---

## Further Reading

- [Blockchain Architecture Details](../architecture/blockchain.md) — implementation specifics, code references, transaction structure
- [Cryptography Concepts](./cryptography.md) — how hashes and signatures secure the chain
- [Security Concepts](./security.md) — threat model and Byzantine fault handling
- [Blockchain Node API](../api/blockchain-node.md) — REST endpoints for chain interaction
