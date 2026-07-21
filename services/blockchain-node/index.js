const express = require('express');
const cors = require('cors');
const crypto = require('crypto-js');
const http = require('http');
const socketIo = require('socket.io');
const Blockchain = require('./src/core/blockchain');
const Block = require('./src/core/block');
const { MerkleTree } = require('./src/core/merkleTree');
const { PeerManager, MessageTypes } = require('./src/network/peerManager');
const NodeMonitor = require('./src/monitoring/nodeMonitor');
const PrometheusMetrics = require('./src/monitoring/prometheusMetrics');
const SecurityMonitor = require('./src/security/securityMonitor');
const { apiKeyAuth } = require('./middleware/auth');

const createChainRoutes = require('./src/routes/chain');
const createVotesRoutes = require('./src/routes/votes');
const createMerkleRoutes = require('./src/routes/merkle');
const createSecurityRoutes = require('./src/routes/security');
const createMetricsRoutes = require('./src/routes/metrics');

// Get node ID from environment or use default
const nodeId = process.env.NODE_ID || 'node1';
const nodeType = process.env.NODE_TYPE || 'validator';
const PORT = process.env.PORT || 3001;

// Create express app
const app = express();
app.use(express.json());

// Root discovery route (before CORS so services are identifiable from browser)
app.get('/', (req, res) => {
  res.json({
    service: 'Blockchain Node',
    nodeId,
    nodeType,
    port: PORT,
    endpoints: {
      chain: '/chain',
      node: '/node',
      peers: '/peers',
      metrics: '/metrics',
      vote: '/vote',
      mine: '/mine',
      transactions: '/transactions/new',
      merkle: '/merkle/stats',
      elections: '/elections/:electionId/results',
      nullifier: '/nullifier/:nullifier',
      security: '/security/status'
    }
  });
});

app.use(cors({
  origin: process.env.BACKEND_URL || "http://localhost:3000",
}));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io for P2P communication
const io = socketIo(server, {
    cors: {
        origin: process.env.PEERS ? process.env.PEERS.split(',') : [],
        methods: ['GET', 'POST']
    }
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
// In production, this would use proper cryptographic key generation
const nodeKeyPair = {
    privateKey: crypto.lib.WordArray.random(32).toString(),
    publicKey: crypto.lib.WordArray.random(32).toString()
};

// Register this node as a validator
blockchain.registerValidator(nodeId, nodeKeyPair.publicKey);

// Listen for peer manager events
peerManager.on('peer_connected', (data) => {
    console.log(`[PEER] Connected: ${data.nodeId}`);
    const stats = peerManager.getStats();
    metrics.updatePeerMetrics(stats.peers || [], stats.healthyPeers, stats.unhealthyPeers);
});

peerManager.on('peer_message', (data) => {
    handlePeerMessage(data.nodeId, data.message);
});

peerManager.on('peer_unhealthy', (data) => {
    console.warn(`[PEER] Unhealthy: ${data.nodeId} - ${data.reason}`);
    const stats = peerManager.getStats();
    metrics.updatePeerMetrics(stats.peers || [], stats.healthyPeers, stats.unhealthyPeers);
});

const sockets = [];

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New peer connected');
    sockets.push(socket);

    socket.on('message', (message) => {
        console.log('Received message:', message);
        handleMessage(socket, message);
    });

    socket.on('disconnect', () => {
        console.log('Peer disconnected');
        const index = sockets.indexOf(socket);
        if (index !== -1) {
            sockets.splice(index, 1);
        }
    });

    socket.emit('message', { type: 'CHAIN', data: blockchain.chain });
});

// Handle messages from peers and socket connections
function handleMessage(senderId, message) {
    if (!message || !message.type) {
        console.warn('Invalid message received');
        return;
    }

    switch (message.type) {
        case MessageTypes.NODE_JOIN:
            console.log(`[MSG] Node join: ${message.data.nodeId}`);
            break;

        case MessageTypes.CHAIN_REQUEST:
            peerManager.sendChainToPeer(senderId, blockchain.chain);
            break;

        case MessageTypes.CHAIN_RESPONSE:
            const receivedChain = message.data;
            if (receivedChain && receivedChain.length > blockchain.chain.length) {
                console.log('[MSG] Received longer chain. Validating...');

                let chainValid = true;
                for (let i = 0; i < receivedChain.length; i++) {
                    const block = receivedChain[i];

                    if (block.index !== i) {
                        console.log(`[MSG] Chain invalid: block index ${block.index} expected ${i}`);
                        chainValid = false;
                        break;
                    }

                    if (i > 0 && block.previousHash !== receivedChain[i - 1].hash) {
                        console.log(`[MSG] Chain invalid: broken link at block ${i}`);
                        chainValid = false;
                        break;
                    }

                    const tempBlock = new Block(block.index, block.timestamp, block.data, block.previousHash);
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
                    blockchain.saveChain();
                    nodeMonitor.updateChainHeight(receivedChain.length);
                    console.log('Chain synchronized');
                } else {
                    console.log('[MSG] Rejected invalid chain from peer');
                }
            }
            break;

        case MessageTypes.HEARTBEAT:
            if (senderId && typeof senderId.emit === 'function') {
                senderId.emit('message', {
                    type: MessageTypes.HEARTBEAT_RESPONSE,
                    timestamp: Date.now()
                });
            } else {
                peerManager.sendToPeer(senderId, {
                    type: MessageTypes.HEARTBEAT_RESPONSE,
                    timestamp: Date.now()
                });
            }
            break;

        case MessageTypes.HEARTBEAT_RESPONSE:
            peerManager.handleHeartbeatResponse(senderId);
            break;

        case MessageTypes.VOTE_BROADCAST:
            console.log('[MSG] Received vote broadcast');
            const voteAnomalies = securityMonitor.analyzeVote(message.data, senderId);
            if (voteAnomalies.some(a => a.severity === 'critical' || a.severity === 'high')) {
                console.warn(`[SECURITY] Suspicious vote from ${senderId}, quarantining`);
                securityMonitor.quarantinePeer(senderId, 'SUSPICIOUS_VOTE');
                break;
            }
            try {
                blockchain.addVoteTransaction(message.data);
                nodeMonitor.recordVoteProcessed();
                metrics.recordVoteProcessed();
                peerManager.broadcastVote(message.data);
            } catch (error) {
                console.error('Error adding vote:', error.message);
            }
            break;

        case MessageTypes.BLOCK_BROADCAST:
            console.log('[MSG] Received block broadcast');
            const receivedBlock = message.data;
            const blockAnomalies = securityMonitor.analyzeBlock(receivedBlock, senderId);
            if (blockAnomalies.some(a => a.severity === 'critical')) {
                console.warn(`[SECURITY] Critical anomalies in block from ${senderId}, rejecting`);
                break;
            }
            if (blockchain.addBlock(receivedBlock, receivedBlock.validator, receivedBlock.signature)) {
                nodeMonitor.recordBlockProduced(receivedBlock);
                nodeMonitor.updateChainHeight(blockchain.chain.length);
                metrics.recordBlockReceived(receivedBlock);
                peerManager.broadcastBlock(receivedBlock);
                console.log('New block added to chain');
            }
            break;

        case 'TRANSACTION':
            console.log('[MSG] Received transaction');
            try {
                blockchain.addTransaction(message.data);
                nodeMonitor.recordTransactionProcessed();
                metrics.recordTransactionProcessed(0);
                peerManager.broadcastMessage(message);
            } catch (error) {
                console.error('Error adding transaction:', error.message);
            }
            break;

        case 'MINE':
            console.log('[MSG] Received mining request');
            const { block: minedBlock, pendingSnapshot: minedSnapshot } = blockchain.createBlock(nodeId);
            minedBlock.signBlock(nodeKeyPair.privateKey);

            if (blockchain.addBlock(minedBlock, nodeId, minedBlock.signature)) {
                blockchain.commitBlock(minedBlock, minedSnapshot);
                nodeMonitor.recordBlockProduced(minedBlock);
                nodeMonitor.updateChainHeight(blockchain.chain.length);
                metrics.recordBlockCreated(minedBlock);
                peerManager.broadcastBlock(minedBlock);
                console.log('New block mined and added to chain');
            }
            break;

        default:
            console.log(`[MSG] Unknown message type: ${message.type}`);
    }
}

function handlePeerMessage(peerId, message) {
    handleMessage(peerId, message);
}

// ==================== ROUTE MODULES ====================

app.use('/', createChainRoutes(blockchain, nodeMonitor, peerManager));
app.use('/', createVotesRoutes(blockchain, nodeMonitor, metrics, peerManager, nodeKeyPair));
app.use('/', createMerkleRoutes(blockchain));
app.use('/', createSecurityRoutes(securityMonitor));
app.use('/', createMetricsRoutes(nodeMonitor, metrics));

// ==================== REMAINING ROUTES ====================

app.get('/peers', (req, res) => {
    res.json(peerManager.getStats());
});

app.get('/peers/discovery-status', (req, res) => {
    const stats = peerManager.getStats();
    const peersEnv = process.env.PEERS ? process.env.PEERS.split(',').filter(p => p.trim()) : [];

    res.json({
        discoveryEnabled: !!process.env.PEERS,
        configuredPeers: peersEnv.length,
        connectedPeers: stats.totalPeers,
        healthyPeers: stats.healthyPeers,
        unhealthyPeers: stats.unhealthyPeers,
        peerDetails: stats.peers,
        configuredPeerUrls: peersEnv,
        timestamp: Date.now()
    });
});

app.post('/nodes/register', apiKeyAuth, (req, res) => {
    const nodes = req.body.nodes || [];

    if (nodes.length === 0) {
        return res.status(400).json({ message: 'Error: Please supply a valid list of nodes' });
    }

    const validNodes = nodes.filter((n) => {
        try {
            new URL(n);
            return true;
        } catch {
            return false;
        }
    });

    validNodes.forEach(node => {
        blockchain.registerNode(node);
    });

    res.json({
        message: 'New nodes have been added',
        total: validNodes.length,
        totalNodes: Array.from(blockchain.nodes)
    });
});

app.post('/validators/register', apiKeyAuth, (req, res) => {
    const { validatorId, publicKey } = req.body;

    if (!validatorId || !publicKey) {
        return res.status(400).json({ message: 'Error: Please supply validator ID and public key' });
    }

    blockchain.registerValidator(validatorId, publicKey);

    res.json({
        message: 'New validator has been registered',
        validators: Array.from(blockchain.validators.keys())
    });
});

app.get('/elections/:electionId/results', (req, res) => {
    const electionId = req.params.electionId;
    const votes = blockchain.getElectionVotes(electionId);

    res.json({
        electionId: electionId,
        voteCount: votes.length,
        votes: votes
    });
});

app.get('/nullifier/:nullifier', (req, res) => {
    const nullifier = req.params.nullifier;
    const isUsed = blockchain.isNullifierUsed(nullifier);

    res.json({
        nullifier: nullifier,
        isUsed: isUsed
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Not Found",
        message: `${req.method} ${req.originalUrl} does not exist`,
        status: 404,
        availableEndpoints: [
            "GET /",
            "GET /chain",
            "GET /node",
            "GET /peers",
            "GET /mine",
            "POST /vote",
            "POST /transactions",
            "GET /transactions/pending",
            "GET /elections/:electionId/results",
        ],
    });
});

// Start the server
server.listen(PORT, () => {
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

// Connect to peer nodes if specified
if (process.env.PEERS) {
    const peers = process.env.PEERS.split(',').filter(p => p.trim());
    console.log(`\n🔗 PEER DISCOVERY: Attempting to connect to ${peers.length} peers...`);
    console.log(`📍 Configured peers: ${peers.join(', ')}\n`);

    let connectionIndex = 0;
    peers.forEach((peerUrl) => {
        const cleanUrl = peerUrl.trim();
        if (cleanUrl) {
            const delay = connectionIndex * 2000;
            setTimeout(() => {
                const peerHost = cleanUrl.split('//')[1];
                const nodeIdFromHost = peerHost ? peerHost.split(':')[0] : `peer_${cleanUrl}`;

                console.log(`[${connectionIndex + 1}/${peers.length}] Connecting to ${cleanUrl}...`);

                peerManager.connectToPeer(cleanUrl, {
                    nodeId: nodeIdFromHost,
                    port: cleanUrl.split(':').pop()
                })
                .then(() => {
                    console.log(`✅ [${connectionIndex + 1}/${peers.length}] Successfully connected to ${cleanUrl}`);
                })
                .catch(err => {
                    console.error(`❌ [${connectionIndex + 1}/${peers.length}] Failed to connect to ${cleanUrl}: ${err.message}`);
                });
            }, delay);
            connectionIndex++;
        }
    });

    setTimeout(() => {
        console.log('\n📊 PEER DISCOVERY STATUS:');
        const stats = peerManager.getStats();
        console.log(`   Connected peers: ${stats.healthyPeers + stats.unhealthyPeers}/${peers.length}`);
        console.log(`   Healthy: ${stats.healthyPeers}`);
        console.log(`   Unhealthy: ${stats.unhealthyPeers}`);
        if (stats.peers && stats.peers.length > 0) {
            console.log('   Peer details:');
            stats.peers.forEach(p => {
                console.log(`     - ${p.nodeId}: ${p.health?.status || 'unknown'}`);
            });
        }
        console.log('');
    }, (peers.length * 2000) + 1000);
} else {
    console.log('⚠️  No peers configured (PEERS environment variable not set)');
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    peerManager.shutdown();
    securityMonitor.destroy();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, blockchain, peerManager, nodeMonitor };
