# Blockchain Mechanics

## Consensus

Development uses simplified **Proof of Work** (difficulty 2, leading zeros). `Block.mineBlock()` in `services/blockchain-node/src/core/block.js:59` increments nonce until hash meets difficulty target. Production path is BFT consensus (Byzantine Fault Tolerance) — `ByzantineValidator` module exists but PoW remains default.

## Peer Network

4 blockchain nodes run for peer consensus (default). Each node runs Express on ports 3001-3004 with:

- HTTP API (`index.js`)
- Socket.IO for P2P messaging
- LevelDB persistence (`levelup` + `leveldown` at `./data/{nodeId}`)

Peer discovery uses `PEERS` env var — comma-separated URLs of sibling nodes. Connections stagger by 2s to avoid thundering herd (`index.js:841`).

`PeerManager` (in `src/network/peerManager.js`) handles heartbeat monitoring, health tracking, and message broadcasting.

## Transaction Structure

Vote transactions submitted to `POST /vote`:

```json
{
  "voterId": "STU001",
  "electionId": "election-123",
  "encryptedBallot": "<RSA-OAEP base64>",
  "nullifier": "<SHA-256 hex>",
  "timestamp": 1763026068827,
  "signature": "<ECDSA base64>",
  "transactionHash": "<SHA-256 hex>"
}
```

`transactionHash` is **deterministic** — computed server-side as SHA-256 of `{electionId, nullifier, encryptedBallot, timestamp}` (`index.js:443-449`). This allows independent verification: anyone with the transaction data can recompute the hash and confirm it matches the chain record.

Each vote is stored as a pending transaction. When a block is mined, pending transactions are snapshotted and committed into the block body.

## Double-Vote Prevention

Nullifiers enforce single-vote-per-election. `Blockchain.isNullifierUsed()` in `src/core/blockchain.js:174` scans all blocks and pending transactions. A matching nullifier rejects the vote. Because nullifiers derive from `privateKey + electionId` (see [crypto.md](crypto.md)), the same voter always produces the same nullifier for a given election — no identity needed.

## Block Structure

`services/blockchain-node/src/core/block.js`:

```javascript
{
  index: 1,
  timestamp: 1763026068827,
  data: { transactions: [...] },
  previousHash: "abc123...",
  merkleRoot: "22b8b069...",       // Merkle tree of block data
  hash: "def456...",                // SHA-256 of all above + nonce
  nonce: 35293,                     // PoW counter
  validator: "node1",               // Block producer
  signature: "<HMAC-SHA256 hex>"    // Validator signature
}
```

`merkleRoot` is calculated from block data via `MerkleTree` (`merkleTree.js`). The root is included in `calculateHash()` so tampering with any transaction changes the block hash.

Genesis block is created at index 0 with message "Genesis Block" and empty transactions.

## Mining Flow

1. `GET /mine` or `MINE` message: create block from pending transactions
2. `mineBlock(difficulty)`: increment nonce until hash starts with `difficulty` zeros
3. `signBlock(privateKey)`: HMAC-SHA256 signature
4. `addBlock()`: validate index, previousHash, hash, validator
5. `commitBlock()`: remove mined transactions from pending
6. Broadcast to peers via Socket.IO `BLOCK_BROADCAST`

## Chain Synchronization

On receiving a longer chain (`CHAIN_RESPONSE` message), the node validates:

- Sequential indices (0, 1, 2, ...)
- `previousHash` links match between consecutive blocks
- Block hash integrity via `Block.calculateHash()`
- Block signatures against registered validator keys

Uses longest-chain rule for conflict resolution.

## Merkle Tree Integration

`services/blockchain-node/src/core/merkleTree.js` implements a binary Merkle tree using SHA-256:

- Leaves are vote data hashes
- Tree builds bottom-up — odd nodes duplicate the last sibling
- `getProof()` returns O(log n) sibling hashes
- `verifyProof()` walks siblings to recompute root

API endpoints serve Merkle roots per block/election, generate proofs per vote, and batch-verify multiple proofs. See [Merkle API](../api/blockchain-node.md) for endpoint details.

## Persistence

LevelDB stores the full chain at `./data/{nodeId}`. `Blockchain.saveChain()` serializes all blocks, `loadChain()` reconstructs them with `Block` constructors on startup. No chain history is pruned — the full ledger persists.

## Network Recovery

`RecoveryManager` (`services/blockchain-node/src/security/recoveryManager.js`) handles post-attack and post-failure recovery.

**Recovery phases:**

```text
IDLE → DETECTING → RECOVERING → VALIDATING → COMPLETE
```

| Phase      | Action                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| IDLE       | No recovery in progress                                                                                 |
| DETECTING  | Identify affected peers via quarantine list                                                             |
| RECOVERING | 5-step protocol: isolate healthy peers → sync state → validate consensus → reconstruct chain → finalize |
| VALIDATING | Verify chain consistency across all peers                                                               |
| COMPLETE   | Recovery metrics recorded, state cleared                                                                |

**Key parameters:**

- Max recovery time: 5 minutes (`maxRecoveryTime`)
- Sync timeout: 10 seconds per peer (`syncTimeout`)
- Consensus threshold: 67% for recovery decisions (`consensusThreshold`)
- Chain validation: checks block structure, hash integrity, previousHash links

`verifyByzantineFaultTolerance(totalPeers, faultyPeers)` confirms the network can continue operating — BFT tolerates up to `floor((n-1)/3)` faulty nodes (1 node in a 5-node network).

Disaster recovery testing available via `testDisasterRecovery(peers, backupData)` — verifies backup integrity, restores peer data, checks consistency.

## Byzantine Validator

`ByzantineFaultToleranceValidator` (`services/blockchain-node/src/security/byzantineValidator.js`) tests and validates BFT limits.

**Configuration:**

- Total nodes: 5 (default)
- Max faulty nodes: `floor((5-1)/3)` = 1
- Consensus required: `ceil(5 * 0.67)` = 4 votes
- Liveness threshold: 95% message processing rate

**Behavior detection:**

| Behavior     | Description                     | Detection Rate |
| ------------ | ------------------------------- | -------------- |
| EQUIVOCATION | Node sends conflicting messages | ~70%           |
| OMISSION     | Node omits required messages    | ~80%           |
| ARBITRARY    | Random/malicious actions        | ~90%           |
| REPLAY       | Replay attack attempts          | ~95%           |
| TIMING       | Timing-based attacks            | ~60%           |

**Recovery flow with Byzantine nodes:**

1. Detect Byzantine nodes (90% accuracy)
2. Isolate from network
3. Verify consensus with remaining healthy nodes
4. Restore network state

Reports generated via `generateBFTReport()` include consensus success rate, detected behaviors, and full consensus history.

## Further Reading

- [Blockchain API](../api/blockchain-node.md) — all REST endpoints
- [Security Architecture](../security/threat-model.md) — attack surfaces, BFT, quarantine, anomaly detection
- **New to blockchain?** See the [Knowledge Base](../knowledge/blockchain.md) for academic explanation of how blockchain works
