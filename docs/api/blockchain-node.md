# Blockchain Node API

Express 5 · Ports 3001–3004 · LevelDB persistence · PoW consensus

## Base URL

```text
http://localhost:3001
```

Nodes run on ports 3001, 3002, 3003, 3004. Each is an independent instance with its own chain state.

## Authentication

**All sensitive endpoints require an API key via `x-api-key` header** (set via `BLOCKCHAIN_API_KEY` env var).

**Protected endpoints (require auth):**

- `/chain`, `/node`, `/node/status`, `/network/status` — chain/node data (C-07)
- `/merkle/verify` — Merkle proof verification (C-06)
- `/vote` — vote submission
- `/transactions/new` — transaction submission
- All Merkle endpoints except health

**Public endpoints (no auth):**

- `/` — service info
- `/health` — healthcheck (used by Docker and monitoring)

## CORS

Restricted to `BACKEND_URL`, `FRONTEND_URL` env vars, and `localhost:5174` fallback. No browser origins permitted in production.

## Rate Limiting

General rate limiting applied to all endpoints.

## Node Identity

Configured via environment:

| Env         | Default   | Description               |
| ----------- | --------- | ------------------------- |
| `NODE_ID`   | node1     | Unique node identifier    |
| `NODE_TYPE` | validator | validator or observer     |
| `PORT`      | 3001      | HTTP + Socket.IO port     |
| `PEERS`     | —         | Comma-separated peer URLs |

Peer discovery reads `PEERS` env var. Each peer connection is staggered by 2 seconds to avoid connection storms.

---

## Core Chain

### `GET /chain`

Full blockchain data.

**Auth:** API key required (`x-api-key` header)

**Response 200:**

```json
{
  "chain": [
    {
      "index": 0,
      "timestamp": "...",
      "data": [],
      "previousHash": "0",
      "hash": "...",
      "nonce": 0,
      "merkleRoot": "..."
    }
  ],
  "length": 1
}
```

### `POST /mine`

Mine a new block from pending transactions. Signs the block with the node's persistent ECDSA key (stored in LevelDB) and broadcasts to peers.

**Auth:** API key required (`x-api-key` header)

**Response 200:**

```json
{
  "message": "New block forged",
  "block": { "index": 1, "timestamp": "...", "data": [...], "previousHash": "...", "hash": "...", "nonce": 12345, "merkleRoot": "...", "signature": "...", "validator": "node1" }
}
```

### `GET /block/:id`

> Note: not directly routed in index.js, but block data available via `/chain` and Merkle endpoints.

---

## Transactions

### `POST /transactions/new`

Add a general transaction to the mempool. Validates fromAddress, toAddress (strings), and amount (positive number). Broadcasts to connected peers.

**Auth:** API key required (`x-api-key` header)

**Body:**

```json
{
  "type": "vote",
  "data": { "electionId": 1, "nullifier": "...", "encryptedBallot": "..." }
}
```

**Response 200:** `{ "message": "Transaction will be added to Block 3" }`

### `POST /vote`

Submit an encrypted vote. Validates all required fields (electionId, nullifier, encryptedBallot, signature, voterId as strings), generates a deterministic transaction hash (SHA-256 of `{electionId, nullifier, encryptedBallot, timestamp}`), checks for security anomalies, records vote via `addVoteTransaction`, and broadcasts to peers.

**Auth:** API key required (`x-api-key` header)

**Body:**

```json
{
  "voterId": 1,
  "electionId": 1,
  "encryptedBallot": "base64-encrypted-ballot",
  "nullifier": "sha256-nullifier",
  "signature": "ecdsa-signature"
}
```

**Response 200:**

```json
{
  "message": "Vote will be added to Block 3",
  "receipt": {
    "transactionHash": "sha256-hash",
    "nullifier": "...",
    "timestamp": 1720000000000,
    "blockIndex": 3
  }
}
```

---

## Merkle Tree

### `GET /merkle/block/:blockIndex`

Merkle root for a specific block.

### `GET /merkle/election/:electionId`

Merkle root for all votes in an election.

**Response 200:**

```json
{
  "electionId": 1,
  "merkleRoot": "...",
  "voteCount": 42,
  "treeDepth": 6,
  "proofSize": 6,
  "timestamp": 1720000000000
}
```

### `POST /merkle/proof`

Generate a Merkle proof for a specific vote.

**Body:** `{ "transactionHash": "...", "electionId": 1 }`

### `POST /merkle/verify`

Verify a Merkle proof.

**Body:** `{ "vote": {...}, "proof": {...}, "merkleRoot": "..." }`

### `GET /merkle/stats`

Merkle tree statistics for all elections.

### `POST /merkle/batch-verify`

Batch verify multiple Merkle proofs.

**Body:** `{ "items": [{ "vote": {...}, "proof": {...} }], "merkleRoot": "..." }`

---

## Elections & Nullifiers

### `GET /elections/:electionId/results`

Get all encrypted votes for an election.

**Response 200:**

```json
{
  "electionId": 1,
  "voteCount": 42,
  "votes": [
    {
      "transactionHash": "...",
      "nullifier": "...",
      "encryptedBallot": "...",
      "electionId": 1,
      "timestamp": 1720000000000
    }
  ]
}
```

### `GET /nullifier/:nullifier`

Check if a nullifier has been used (double-vote prevention).

**Response 200:** `{ "nullifier": "...", "isUsed": true }`

---

## Network & Peers

### `GET /node`

Basic node info.

**Response 200:**

```json
{
  "nodeId": "node1",
  "nodeType": "validator",
  "validators": ["node1"],
  "peers": 3
}
```

### `GET /node/status`

Comprehensive node status from the NodeMonitor.

### `GET /network/status`

Network status: peer health, chain height comparison, consensus state.

### `GET /peers`

Peer manager statistics.

### `GET /peers/discovery-status`

Detailed peer discovery info including configured URLs, connected/healthy/unhealthy counts.

### `POST /nodes/register`

Register one or more peer nodes.

**Body:** `{ "nodes": ["http://localhost:3002", "http://localhost:3003"] }`

### `POST /validators/register`

Register a new validator.

**Body:** `{ "validatorId": "node2", "publicKey": "..." }`

---

## Metrics & Monitoring

### `GET /metrics`

Prometheus-format metrics (text/plain).

### `GET /metrics/json`

Same metrics in JSON format.

### `GET /metrics/blocks`

Block production metrics.

### `GET /metrics/transactions`

Transaction processing metrics.

---

## Security

### `GET /security/status`

Security monitor state: behavioral metrics, quarantined peers, BFT metrics, recovery status.

### `GET /security/report`

Full security report.

---

## P2P Messaging (Socket.IO)

WebSocket-based peer communication on the same port. Message types:

| Type                 | Direction     | Purpose                        |
| -------------------- | ------------- | ------------------------------ |
| `NODE_JOIN`          | incoming      | New peer handshake             |
| `CHAIN_REQUEST`      | bidirectional | Request current chain          |
| `CHAIN_RESPONSE`     | incoming      | Receive longer chain           |
| `HEARTBEAT`          | bidirectional | Liveness check                 |
| `HEARTBEAT_RESPONSE` | bidirectional | Acknowledge liveness           |
| `VOTE_BROADCAST`     | incoming      | Relay vote to all peers        |
| `BLOCK_BROADCAST`    | incoming      | Relay new block to all peers   |
| `TRANSACTION`        | incoming      | Relay transaction to all peers |
| `MINE`               | incoming      | Remote mining request          |

### Chain Sync Logic

When a `CHAIN_RESPONSE` is received with a longer chain, the node validates:

1. Sequential block indices (0, 1, 2...)
2. `previousHash` links match the preceding block
3. Block hash integrity via `Block.calculateHash()`
4. Block signatures against registered validator public keys

If valid, the chain is replaced and persisted to LevelDB.
