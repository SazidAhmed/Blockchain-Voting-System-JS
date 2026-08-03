const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const crypto = require("crypto");
const http = require("http");
const socketIo = require("socket.io");
const Blockchain = require("./src/core/blockchain");
const Block = require("./src/core/block");
const { MerkleTree } = require("./src/core/merkleTree");
const { PeerManager, MessageTypes } = require("./src/network/peerManager");
const NodeMonitor = require("./src/monitoring/nodeMonitor");
const PrometheusMetrics = require("./src/monitoring/prometheusMetrics");
const SecurityMonitor = require("./src/security/securityMonitor");
const { apiKeyAuth } = require("./middleware/auth");
const { sha256 } = require("./src/core/signature");

const createChainRoutes = require("./src/routes/chain");
const createVotesRoutes = require("./src/routes/votes");
const createMerkleRoutes = require("./src/routes/merkle");
const createSecurityRoutes = require("./src/routes/security");
const createMetricsRoutes = require("./src/routes/metrics");

// Get node ID from environment or use default
const nodeId = process.env.NODE_ID || "node1";
const nodeType = process.env.NODE_TYPE || "validator";
const PORT = process.env.PORT || 3001;

// Create express app
const app = express();
app.disable("x-powered-by");
app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: true } }));
app.use(express.json());

// Root discovery route — dev only
if (process.env.NODE_ENV !== "production") {
  app.get("/", (req, res) => {
    res.json({
      service: "Blockchain Node",
      nodeId,
      nodeType,
      port: PORT,
      endpoints: {
        chain: "/chain",
        node: "/node",
        peers: "/peers",
        metrics: "/metrics",
        vote: "/vote",
        mine: "/mine",
        transactions: "/transactions/new",
        merkle: "/merkle/stats",
        elections: "/elections/:electionId/results",
        nullifier: "/nullifier/:nullifier",
        security: "/security/status",
      },
    });
  });
}

const nodeAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
if (nodeAllowedOrigins.length === 0) {
  nodeAllowedOrigins.push(process.env.BACKEND_URL || "http://localhost:3000");
  nodeAllowedOrigins.push(process.env.FRONTEND_URL || "http://localhost:5173");
  nodeAllowedOrigins.push("http://localhost:5174");
}

// Public health endpoint (used by Docker healthchecks — no auth required)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", nodeId, timestamp: Date.now() });
});
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (nodeAllowedOrigins.indexOf(origin) !== -1)
        return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io for P2P communication
const io = socketIo(server, {
  cors: {
    origin: process.env.PEERS ? process.env.PEERS.split(",") : [],
    methods: ["GET", "POST"],
  },
});

// Initialize blockchain
const blockchain = new Blockchain(nodeId);

// Initialize PeerManager
const peerManager = new PeerManager(nodeId, nodeType);

// Initialize NodeMonitor
const nodeMonitor = new NodeMonitor(nodeId, nodeType);

// Initialize Prometheus Metrics
const metrics = new PrometheusMetrics(nodeId, nodeType);

// Initialize Security Modules
const securityMonitor = new SecurityMonitor({ nodeId });

// Load or create persistent node keypair (C-02 — never regenerate on restart)
let nodeKeyPair;
blockchain
  .getOrCreateNodeKey()
  .then((kp) => {
    nodeKeyPair = kp;
    blockchain.registerValidator(nodeId, kp.publicKey);
  })
  .catch((err) => {
    console.error("FATAL: failed to load/create node keypair:", err.message);
    process.exit(1);
  });

// Listen for peer manager events
peerManager.on("peer_connected", (data) => {
  console.log(`[PEER] Connected: ${data.nodeId}`);
  const stats = peerManager.getStats();
  metrics.updatePeerMetrics(
    stats.peers || [],
    stats.healthyPeers,
    stats.unhealthyPeers,
  );
});

peerManager.on("peer_message", (data) => {
  handlePeerMessage(data.nodeId, data.message).catch((err) =>
    console.error("Error handling peer message:", err.message),
  );
});

peerManager.on("peer_unhealthy", (data) => {
  console.warn(`[PEER] Unhealthy: ${data.nodeId} - ${data.reason}`);
  const stats = peerManager.getStats();
  metrics.updatePeerMetrics(
    stats.peers || [],
    stats.healthyPeers,
    stats.unhealthyPeers,
  );
});

// Socket.io connection handling
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const expected = process.env.BLOCKCHAIN_API_KEY;
  if (!expected) {
    return next(new Error("Server misconfigured: BLOCKCHAIN_API_KEY not set"));
  }
  if (
    !token ||
    token.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  ) {
    return next(new Error("Unauthorized peer connection"));
  }
  next();
});

io.on("connection", (socket) => {
  console.log("New peer connected");

  socket.on("message", (message) => {
    console.log("Received message:", message);
    handleMessage(socket, message).catch((err) =>
      console.error("Error handling socket message:", err.message),
    );
  });

  socket.on("disconnect", () => {
    console.log("Peer disconnected");
  });

  socket.emit("message", { type: "CHAIN", data: blockchain.chain });
});

// Handle messages from peers and socket connections
async function handleMessage(senderId, message) {
  if (!message || !message.type) {
    console.warn("Invalid message received");
    return;
  }

  if (securityMonitor.isQuarantined(senderId)) {
    console.warn(`Blocked message from quarantined peer: ${senderId}`);
    return;
  }

  switch (message.type) {
    case MessageTypes.NODE_JOIN:
      console.log(`[MSG] Node join: ${message.data.nodeId}`);
      if (message.data.nodeId && typeof senderId === "object") {
        if (
          !peerManager.peers.has(message.data.nodeId) ||
          !peerManager.peers.get(message.data.nodeId)?.socket?.connected
        ) {
          peerManager.addPeer(message.data.nodeId, senderId, {
            nodeId: message.data.nodeId,
            port: "unknown",
          });
        }
      }
      break;

    case "CHAIN":
      validateAndAcceptChain(message.data);
      break;

    case MessageTypes.CHAIN_REQUEST:
      peerManager.sendChainToPeer(senderId, blockchain.chain);
      break;

    case MessageTypes.CHAIN_RESPONSE:
      validateAndAcceptChain(message.data);
      break;

    case MessageTypes.HEARTBEAT:
      if (senderId && typeof senderId.emit === "function") {
        senderId.emit("message", {
          type: MessageTypes.HEARTBEAT_RESPONSE,
          timestamp: Date.now(),
        });
      } else {
        peerManager.sendToPeer(senderId, {
          type: MessageTypes.HEARTBEAT_RESPONSE,
          timestamp: Date.now(),
        });
      }
      break;

    case MessageTypes.HEARTBEAT_RESPONSE:
      if (senderId && typeof senderId.emit === "function") {
        for (const [nid, peer] of peerManager.peers) {
          if (peer.socket === senderId) {
            peerManager.handleHeartbeatResponse(nid);
            break;
          }
        }
      } else {
        peerManager.handleHeartbeatResponse(senderId);
      }
      break;

    case MessageTypes.VOTE_BROADCAST:
      console.log("[MSG] Received vote broadcast");
      const voteAnomalies = securityMonitor.analyzeVote(message.data, senderId);
      if (
        voteAnomalies.some(
          (a) => a.severity === "critical" || a.severity === "high",
        )
      ) {
        console.warn(
          `[SECURITY] Suspicious vote from ${senderId}, quarantining`,
        );
        securityMonitor.quarantinePeer(senderId, "SUSPICIOUS_VOTE");
        break;
      }
      try {
        blockchain.addVoteTransaction(message.data);
        nodeMonitor.recordVoteProcessed();
        metrics.recordVoteProcessed();
        peerManager.broadcastVote(message.data);
      } catch (error) {
        console.error("Error adding vote:", error.message);
      }
      break;

    case MessageTypes.BLOCK_BROADCAST:
      console.log("[MSG] Received block broadcast");
      const receivedBlock = message.data;
      const blockAnomalies = securityMonitor.analyzeBlock(
        receivedBlock,
        senderId,
      );
      if (blockAnomalies.some((a) => a.severity === "critical")) {
        console.warn(
          `[SECURITY] Critical anomalies in block from ${senderId}, rejecting`,
        );
        break;
      }
      if (
        await blockchain.addBlock(
          receivedBlock,
          receivedBlock.validator,
          receivedBlock.signature,
        )
      ) {
        nodeMonitor.recordBlockProduced(receivedBlock);
        nodeMonitor.updateChainHeight(blockchain.chain.length);
        metrics.recordBlockReceived(receivedBlock);
        peerManager.broadcastBlock(receivedBlock);
        console.log("New block added to chain");
      }
      break;

    case "TRANSACTION":
      console.log("[MSG] Received transaction");
      try {
        blockchain.addTransaction(message.data);
        nodeMonitor.recordTransactionProcessed();
        metrics.recordTransactionProcessed(0);
        peerManager.broadcastMessage(message);
      } catch (error) {
        console.error("Error adding transaction:", error.message);
      }
      break;

    case "MINE":
      console.log("[MSG] Received mining request");
      try {
        const { block: minedBlock, pendingSnapshot: minedSnapshot } =
          await blockchain.createBlock(nodeId);
        minedBlock.signBlock(nodeKeyPair.privateKey);

        if (
          await blockchain.addBlock(minedBlock, nodeId, minedBlock.signature)
        ) {
          blockchain.commitBlock(minedBlock, minedSnapshot);
          nodeMonitor.recordBlockProduced(minedBlock);
          nodeMonitor.updateChainHeight(blockchain.chain.length);
          metrics.recordBlockCreated(minedBlock);
          peerManager.broadcastBlock(minedBlock);
          console.log("New block mined and added to chain");
        }
      } catch (error) {
        console.error("Error mining block:", error.message);
      }
      break;

    default:
      console.log(`[MSG] Unknown message type: ${message.type}`);
  }
}

async function handlePeerMessage(peerId, message) {
  return handleMessage(peerId, message);
}

async function validateAndAcceptChain(receivedChain) {
  if (!receivedChain || receivedChain.length <= blockchain.chain.length) {
    return;
  }
  console.log("[MSG] Received longer chain. Validating...");

  let chainValid = true;
  for (let i = 0; i < receivedChain.length; i++) {
    const block = receivedChain[i];

    if (block.index !== i) {
      console.log(
        `[MSG] Chain invalid: block index ${block.index} expected ${i}`,
      );
      chainValid = false;
      break;
    }

    if (i > 0 && block.previousHash !== receivedChain[i - 1].hash) {
      console.log(`[MSG] Chain invalid: broken link at block ${i}`);
      chainValid = false;
      break;
    }

    const tempBlock = new Block(
      block.index,
      block.timestamp,
      block.data,
      block.previousHash,
    );
    tempBlock.nonce = block.nonce;
    tempBlock.merkleRoot = block.merkleRoot;
    if (tempBlock.calculateHash() !== block.hash) {
      console.log(`[MSG] Chain invalid: hash mismatch at block ${i}`);
      chainValid = false;
      break;
    }

    if (block.signature && block.validator) {
      const validatorKey = blockchain.validators.get(block.validator);
      if (validatorKey) {
        tempBlock.signature = block.signature;
        if (!tempBlock.verifySignature(validatorKey)) {
          console.log(`[MSG] Chain invalid: bad signature at block ${i}`);
          chainValid = false;
          break;
        }
      }
    }
  }

  if (chainValid) {
    blockchain.chain = receivedChain;
    blockchain.rebuildVoteIndex();
    await blockchain.saveChain();
    nodeMonitor.updateChainHeight(receivedChain.length);
    console.log("Chain synchronized");
  } else {
    console.log("[MSG] Rejected invalid chain from peer");
  }
}

// ==================== ROUTE MODULES ====================

app.use("/", createChainRoutes(blockchain, nodeMonitor, peerManager));
app.use(
  "/",
  createVotesRoutes(
    blockchain,
    nodeMonitor,
    metrics,
    peerManager,
    () => nodeKeyPair,
  ),
);
app.use("/", createMerkleRoutes(blockchain));
app.use("/", createSecurityRoutes(securityMonitor));
app.use("/", createMetricsRoutes(nodeMonitor, metrics));

// ==================== REMAINING ROUTES ====================

app.get("/peers", (req, res) => {
  res.json(peerManager.getStats());
});

app.get("/peers/discovery-status", (req, res) => {
  const stats = peerManager.getStats();
  const peersEnv = process.env.PEERS
    ? process.env.PEERS.split(",").filter((p) => p.trim())
    : [];

  res.json({
    discoveryEnabled: !!process.env.PEERS,
    configuredPeers: peersEnv.length,
    connectedPeers: stats.totalPeers,
    healthyPeers: stats.healthyPeers,
    unhealthyPeers: stats.unhealthyPeers,
    peerDetails: stats.peers,
    configuredPeerUrls: peersEnv,
    timestamp: Date.now(),
  });
});

app.post("/nodes/register", apiKeyAuth, (req, res) => {
  const nodes = req.body.nodes || [];

  if (nodes.length === 0) {
    return res
      .status(400)
      .json({ message: "Error: Please supply a valid list of nodes" });
  }

  const validNodes = nodes.filter((n) => {
    try {
      new URL(n);
      return true;
    } catch {
      return false;
    }
  });

  validNodes.forEach((node) => {
    blockchain.registerNode(node);
  });

  res.json({
    message: "New nodes have been added",
    total: validNodes.length,
    totalNodes: Array.from(blockchain.nodes),
  });
});

app.post("/validators/register", apiKeyAuth, (req, res) => {
  const { validatorId, publicKey } = req.body;

  if (!validatorId || !publicKey) {
    return res
      .status(400)
      .json({ message: "Error: Please supply validator ID and public key" });
  }

  blockchain.registerValidator(validatorId, publicKey);

  res.json({
    message: "New validator has been registered",
    validators: Array.from(blockchain.validators.keys()),
  });
});

app.get("/elections/:electionId/results", (req, res) => {
  const electionId = req.params.electionId;
  const votes = blockchain.getElectionVotes(electionId);

  res.json({
    electionId: electionId,
    voteCount: votes.length,
    votes: votes,
  });
});

app.get("/nullifier/:nullifier", (req, res) => {
  const nullifier = req.params.nullifier;
  const isUsed = blockchain.isNullifierUsed(nullifier);

  res.json({
    nullifier: nullifier,
    isUsed: isUsed,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `${req.method} ${req.originalUrl} does not exist`,
    status: 404,
    availableEndpoints: [
      "GET /health",
      "GET /chain",
      "GET /node",
      "GET /peers",
      "POST /mine",
      "POST /vote",
      "POST /transactions/new",
      "GET /elections/:electionId/results",
    ],
  });
});

// Global error handler (C-08)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    status: 500,
  });
});

// Start the server
const serverInstance = server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  Blockchain Node Server Started            ║
╠════════════════════════════════════════════╣
║  Node ID: ${nodeId.padEnd(40)} ║
║  Node Type: ${nodeType.padEnd(37)} ║
║  Port: ${PORT.toString().padEnd(39)} ║
║  Timestamp: ${new Date().toISOString()} ║
╚════════════════════════════════════════════╝
    `);
});

serverInstance.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `FATAL: Port ${PORT} is already in use. Is another blockchain node running?`,
    );
    process.exit(1);
  }
  console.error("Server error:", err.message);
  process.exit(1);
});

// Connect to peer nodes if specified
if (process.env.PEERS) {
  const peers = process.env.PEERS.split(",").filter((p) => p.trim());
  console.log(
    `\n🔗 PEER DISCOVERY: Attempting to connect to ${peers.length} peers...`,
  );
  console.log(`📍 Configured peers: ${peers.join(", ")}\n`);

  let connectionIndex = 0;
  peers.forEach((peerUrl) => {
    const cleanUrl = peerUrl.trim();
    if (cleanUrl) {
      const delay = connectionIndex * 2000;
      setTimeout(() => {
        const peerHost = cleanUrl.split("//")[1];
        const nodeIdFromHost = peerHost
          ? peerHost.split(":")[0]
          : `peer_${cleanUrl}`;

        console.log(
          `[${connectionIndex + 1}/${peers.length}] Connecting to ${cleanUrl}...`,
        );

        peerManager
          .connectToPeer(cleanUrl, {
            nodeId: nodeIdFromHost,
            port: cleanUrl.split(":").pop(),
          })
          .then(() => {
            console.log(
              `✅ [${connectionIndex + 1}/${peers.length}] Successfully connected to ${cleanUrl}`,
            );
          })
          .catch((err) => {
            console.error(
              `❌ [${connectionIndex + 1}/${peers.length}] Failed to connect to ${cleanUrl}: ${err.message}`,
            );
          });
      }, delay);
      connectionIndex++;
    }
  });

  setTimeout(
    () => {
      console.log("\n📊 PEER DISCOVERY STATUS:");
      const stats = peerManager.getStats();
      console.log(
        `   Connected peers: ${stats.healthyPeers + stats.unhealthyPeers}/${peers.length}`,
      );
      console.log(`   Healthy: ${stats.healthyPeers}`);
      console.log(`   Unhealthy: ${stats.unhealthyPeers}`);
      if (stats.peers && stats.peers.length > 0) {
        console.log("   Peer details:");
        stats.peers.forEach((p) => {
          console.log(`     - ${p.nodeId}: ${p.health?.status || "unknown"}`);
        });
      }
      console.log("");
    },
    peers.length * 2000 + 1000,
  );
} else {
  console.log("⚠️  No peers configured (PEERS environment variable not set)");
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await blockchain.saveChain();
  peerManager.shutdown();
  securityMonitor.destroy();
  const forceExit = setTimeout(() => {
    console.error("Forced exit after timeout");
    process.exit(1);
  }, 10000);
  server.close(() => {
    clearTimeout(forceExit);
    console.log("Server closed");
    process.exit(0);
  });
});

module.exports = { app, server, blockchain, peerManager, nodeMonitor };
