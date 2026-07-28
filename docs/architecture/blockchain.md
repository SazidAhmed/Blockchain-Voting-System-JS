# Blockchain Mechanics

## Consensus

Development uses simplified **Proof of Work** (difficulty 2, leading zeros). `Block.mineBlock()` in `services/blockchain-node/src/core/block.js:59` increments nonce until hash meets difficulty target. Production path is BFT consensus (Byzantine Fault Tolerance) — `ByzantineValidator` module exists but PoW remains default.

## Peer Network

4 blockchain nodes run for peer consensus (default). Each node runs Express on ports 3001-3004 with:

- HTTP API (`index.js`)
- Socket.IO for P2P messaging
- LevelDB persistence (`levelup` + `leveldown` at `./data/{nodeId}`)

Peer discovery uses `PEERS` env var — comma-separated URLs of sibling nodes. Connections stagger by 2s to avoid thundering herd.

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

`transactionHash` is **deterministic** — computed server-side as SHA-256 of `{electionId, nullifier, encryptedBallot, timestamp}`. This allows independent verification: anyone with the transaction data can recompute the hash and confirm it matches the chain record.

Each vote is stored as a pending transaction. When a block is mined, pending transactions are snapshotted and committed into the block body.

## Double-Vote Prevention

Nullifiers enforce single-vote-per-election. `Blockchain.isNullifierUsed()` in `src/core/blockchain.js:174` scans all blocks and pending transactions. A matching nullifier rejects the vote. Nullifiers are derived server-side from the authenticated user's ID and election ID — clients do not supply nullifiers directly, preventing manipulation.

## Block Structure

`services/blockchain-node/src/core/block.js`:

```javascript
{
  index: 1,
  timestamp: 1763026068827,
  data: { transactions: [...] },
  previousHash: "abc123...",
  merkleRoot: "22b8b069...",        // Merkle tree of block data
  hash: "def456...",                // SHA-256 of all above + nonce
  nonce: 35293,                     // PoW counter
  validator: "node1",               // Block producer
  signature: "<ECDSA P-256 hex>"    // Validator signature
}
```

`merkleRoot` is calculated from block data via `MerkleTree` (`merkleTree.js`). The root is included in `calculateHash()` so tampering with any transaction changes the block hash.

Genesis block is created at index 0 with message "Genesis Block" and empty transactions.

## Mining Flow

1. `POST /mine` or `MINE` message: create block from pending transactions
2. `mineBlock(difficulty)`: increment nonce until hash starts with `difficulty` zeros
3. `signBlock(privateKey)`: ECDSA P-256 signature using node's keypair
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

## Network Recovery & Byzantine Tolerance

`SecurityMonitor` (`services/blockchain-node/src/security/securityMonitor.js`) handles peer behavior tracking, anomaly detection, and quarantine. Peers are auto-isolated after 5 violations; manual review required for release. Chain sync uses longest-chain rule with block index, previousHash, hash integrity, and validator signature validation.

The 4-node network tolerates faults via peer health monitoring and quarantine — a quarantined node is excluded from consensus until manually released. Full BFT consensus (PBFT) is a documented production target but not yet implemented.

## Further Reading

- [Blockchain API](../api/blockchain-node.md) — all REST endpoints
- [Security Architecture](../security/threat-model.md) — attack surfaces, BFT, quarantine, anomaly detection
- **New to blockchain?** See the [Knowledge Base](../knowledge/blockchain.md) for academic explanation of how blockchain works
