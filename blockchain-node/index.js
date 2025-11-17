const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto-js');
const http = require('http');
const socketIo = require('socket.io');
const Blockchain = require('./blockchain');
const Block = require('./block');
const { MerkleTree, MerkleTreeUtils } = require('./merkleTree');
const { PeerManager, MessageTypes } = require('./peerManager');
const NodeMonitor = require('./nodeMonitor');
const PrometheusMetrics = require('./prometheusMetrics');

// Get node ID from environment or use default
const nodeId = process.env.NODE_ID || 'node1';
const nodeType = process.env.NODE_TYPE || 'validator';
const PORT = process.env.PORT || 3001;

// Create express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io for P2P communication
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
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
    // Update peer metrics
    const stats = peerManager.getStats();
    metrics.updatePeerMetrics(stats.peers || [], stats.healthyPeers, stats.unhealthyPeers);
});

peerManager.on('peer_message', (data) => {
    handlePeerMessage(data.nodeId, data.message);
});

peerManager.on('peer_unhealthy', (data) => {
    console.warn(`[PEER] Unhealthy: ${data.nodeId} - ${data.reason}`);
    // Update peer metrics
    const stats = peerManager.getStats();
    metrics.updatePeerMetrics(stats.peers || [], stats.healthyPeers, stats.unhealthyPeers);
});

const sockets = [];

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New peer connected');
    sockets.push(socket);

    // Handle messages from peers
    socket.on('message', (message) => {
        console.log('Received message:', message);
        handleMessage(socket, message);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Peer disconnected');
        const index = sockets.indexOf(socket);
        if (index !== -1) {
            sockets.splice(index, 1);
        }
    });

    // Send current blockchain to new peer
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
            // Node join handshake handled by peer manager
            break;

        case MessageTypes.CHAIN_REQUEST:
            // Send current blockchain to requesting node
            peerManager.sendChainToPeer(senderId, blockchain.chain);
            break;

        case MessageTypes.CHAIN_RESPONSE:
            // Handle receiving a blockchain
            const receivedChain = message.data;
            if (receivedChain && receivedChain.length > blockchain.chain.length) {
                console.log('[MSG] Received longer chain. Validating...');
                // In a real implementation, we would validate the received chain
                blockchain.chain = receivedChain;
                blockchain.saveChain();
                nodeMonitor.updateChainHeight(receivedChain.length);
                console.log('Chain synchronized');
            }
            break;

        case MessageTypes.HEARTBEAT:
            // Respond to heartbeat
            peerManager.sendToPeer(senderId, {
                type: MessageTypes.HEARTBEAT_RESPONSE,
                timestamp: Date.now()
            });
            break;

        case MessageTypes.HEARTBEAT_RESPONSE:
            peerManager.handleHeartbeatResponse(senderId);
            break;

        case MessageTypes.VOTE_BROADCAST:
            // Handle receiving a new vote
            console.log('[MSG] Received vote broadcast');
            try {
                blockchain.addVoteTransaction(message.data);
                nodeMonitor.recordVoteProcessed();
                metrics.recordVoteProcessed(); // Record vote metric
                // Broadcast to other peers
                peerManager.broadcastVote(message.data);
            } catch (error) {
                console.error('Error adding vote:', error.message);
            }
            break;

        case MessageTypes.BLOCK_BROADCAST:
            // Handle receiving a new block
            console.log('[MSG] Received block broadcast');
            const receivedBlock = message.data;
            if (blockchain.addBlock(receivedBlock, receivedBlock.validator, receivedBlock.signature)) {
                nodeMonitor.recordBlockProduced(receivedBlock);
                nodeMonitor.updateChainHeight(blockchain.chain.length);
                metrics.recordBlockReceived(receivedBlock); // Record block received metric
                // Broadcast to other peers
                peerManager.broadcastBlock(receivedBlock);
                console.log('New block added to chain');
            }
            break;

        case 'TRANSACTION':
            // Handle receiving a new transaction
            console.log('[MSG] Received transaction');
            try {
                blockchain.addTransaction(message.data);
                nodeMonitor.recordTransactionProcessed();
                metrics.recordTransactionProcessed(0); // Record transaction metric
                // Broadcast to other peers
                peerManager.broadcastMessage(message);
            } catch (error) {
                console.error('Error adding transaction:', error.message);
            }
            break;

        case 'MINE':
            // Handle mining request
            console.log('[MSG] Received mining request');
            const newBlock = blockchain.createBlock(nodeId);
            newBlock.signBlock(nodeKeyPair.privateKey);

            if (blockchain.addBlock(newBlock, nodeId, newBlock.signature)) {
                nodeMonitor.recordBlockProduced(newBlock);
                nodeMonitor.updateChainHeight(blockchain.chain.length);
                metrics.recordBlockCreated(newBlock); // Record block created metric
                peerManager.broadcastBlock(newBlock);
                console.log('New block mined and added to chain');
            }
            break;

        default:
            console.log(`[MSG] Unknown message type: ${message.type}`);
    }
}

// Handle peer messages
function handlePeerMessage(peerId, message) {
    handleMessage(peerId, message);
}

// API endpoints

// Get the full blockchain
app.get('/chain', (req, res) => {
    res.json({
        chain: blockchain.chain,
        length: blockchain.chain.length
    });
});

// Get node info
app.get('/node', (req, res) => {
    res.json({
        nodeId: nodeId,
        nodeType: nodeType,
        validators: Array.from(blockchain.validators.keys()),
        peers: blockchain.nodes.size
    });
});

// Get node status (comprehensive)
app.get('/node/status', (req, res) => {
    res.json(nodeMonitor.getNodeStatus());
});

// Get network status
app.get('/network/status', (req, res) => {
    res.json(nodeMonitor.getNetworkStatus(peerManager, blockchain));
});

// Get peer information
app.get('/peers', (req, res) => {
    res.json(peerManager.getStats());
});

// Get peer discovery status (detailed)
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

// Get block production metrics
app.get('/metrics/blocks', (req, res) => {
    res.json(nodeMonitor.getBlockProductionMetrics());
});

// Get transaction metrics
app.get('/metrics/transactions', (req, res) => {
    res.json(nodeMonitor.getTransactionMetrics());
});

// Prometheus metrics endpoint (Prometheus-format)
app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics.generateMetrics());
});

// Prometheus metrics endpoint (JSON format for API calls)
app.get('/metrics/json', (req, res) => {
    res.json(metrics.getMetricsJSON());
});

// Register a new node
app.post('/nodes/register', (req, res) => {
    const nodes = req.body.nodes;
    
    if (!nodes || nodes.length === 0) {
        return res.status(400).json({ message: 'Error: Please supply a valid list of nodes' });
    }
    
    nodes.forEach(node => {
        blockchain.registerNode(node);
    });
    
    res.json({
        message: 'New nodes have been added',
        totalNodes: Array.from(blockchain.nodes)
    });
});

// Register a new validator
app.post('/validators/register', (req, res) => {
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

// Create a new transaction
app.post('/transactions/new', (req, res) => {
    const transaction = req.body;
    
    try {
        const index = blockchain.addTransaction(transaction);
        nodeMonitor.recordTransactionProcessed();
        metrics.recordTransactionProcessed(0); // latency will be 0 initially
        
        // Broadcast to peers
        peerManager.broadcastMessage({
            type: 'TRANSACTION',
            data: transaction,
            timestamp: Date.now()
        });
        
        res.json({ message: `Transaction will be added to Block ${index}` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Submit a vote
app.post('/vote', (req, res) => {
    const vote = req.body;
    
    try {
        // Generate deterministic transaction hash from vote data
        const txData = JSON.stringify({
            electionId: vote.electionId,
            nullifier: vote.nullifier,
            encryptedBallot: vote.encryptedBallot,
            timestamp: vote.timestamp || Date.now()
        });
        const transactionHash = crypto.SHA256(txData).toString();
        
        // Add transaction hash to vote
        vote.transactionHash = transactionHash;
        
        const index = blockchain.addVoteTransaction(vote);
        nodeMonitor.recordVoteProcessed();
        metrics.recordVoteProcessed(); // Record vote processed
        
        // Broadcast to peers
        peerManager.broadcastVote(vote);
        
        res.json({ 
            message: `Vote will be added to Block ${index}`,
            receipt: {
                transactionHash: transactionHash,
                nullifier: vote.nullifier,
                timestamp: Date.now(),
                blockIndex: index
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Mine a new block
app.get('/mine', (req, res) => {
    const newBlock = blockchain.createBlock(nodeId);
    newBlock.signBlock(nodeKeyPair.privateKey);
    
    if (blockchain.addBlock(newBlock, nodeId, newBlock.signature)) {
        nodeMonitor.recordBlockProduced(newBlock);
        nodeMonitor.updateChainHeight(blockchain.chain.length);
        
        // Record metrics
        metrics.recordBlockCreated(newBlock);
        
        // Broadcast to peers
        peerManager.broadcastBlock(newBlock);
        
        res.json({
            message: 'New block forged',
            block: newBlock
        });
    } else {
        res.status(500).json({ message: 'Error adding block to chain' });
    }
});

// Get election results
app.get('/elections/:electionId/results', (req, res) => {
    const electionId = req.params.electionId;
    const votes = blockchain.getElectionVotes(electionId);
    
    // In a real implementation, we would decrypt and tally the votes
    // For now, we'll just return the encrypted votes
    
    res.json({
        electionId: electionId,
        voteCount: votes.length,
        votes: votes
    });
});

// Check if a nullifier has been used
app.get('/nullifier/:nullifier', (req, res) => {
    const nullifier = req.params.nullifier;
    const isUsed = blockchain.isNullifierUsed(nullifier);
    
    res.json({
        nullifier: nullifier,
        isUsed: isUsed
    });
});

// ==================== MERKLE TREE ENDPOINTS ====================

/**
 * Get Merkle root for a specific block
 * GET /merkle/block/:blockIndex
 */
app.get('/merkle/block/:blockIndex', (req, res) => {
    const blockIndex = parseInt(req.params.blockIndex);
    
    if (isNaN(blockIndex) || blockIndex < 0 || blockIndex >= blockchain.chain.length) {
        return res.status(400).json({ 
            error: 'Invalid block index',
            chainLength: blockchain.chain.length
        });
    }
    
    const block = blockchain.chain[blockIndex];
    
    res.json({
        blockIndex: blockIndex,
        merkleRoot: block.merkleRoot,
        transactionCount: block.data ? block.data.length : 0,
        timestamp: block.timestamp
    });
});

/**
 * Get Merkle root for an election
 * GET /merkle/election/:electionId
 */
app.get('/merkle/election/:electionId', (req, res) => {
    const electionId = req.params.electionId;
    
    try {
        const votes = blockchain.getElectionVotes(electionId);
        
        if (votes.length === 0) {
            return res.status(404).json({ 
                error: 'No votes found for this election',
                electionId: electionId
            });
        }
        
        const tree = MerkleTree.fromVotes(votes);
        const stats = tree.getStats();
        
        res.json({
            electionId: electionId,
            merkleRoot: tree.getRoot(),
            voteCount: votes.length,
            treeDepth: stats.depth,
            proofSize: stats.proofSize,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error generating Merkle tree',
            message: error.message
        });
    }
});

/**
 * Generate Merkle proof for a specific vote
 * POST /merkle/proof
 * Body: { transactionHash, electionId }
 */
app.post('/merkle/proof', (req, res) => {
    const { transactionHash, electionId } = req.body;
    
    if (!transactionHash || !electionId) {
        return res.status(400).json({ 
            error: 'Missing required fields: transactionHash, electionId'
        });
    }
    
    try {
        const votes = blockchain.getElectionVotes(electionId);
        
        if (votes.length === 0) {
            return res.status(404).json({ 
                error: 'No votes found for this election'
            });
        }
        
        // Find the vote with this transaction hash
        const vote = votes.find(v => v.transactionHash === transactionHash);
        
        if (!vote) {
            return res.status(404).json({ 
                error: 'Vote not found in election',
                transactionHash: transactionHash
            });
        }
        
        // Create tree and generate proof
        const tree = MerkleTree.fromVotes(votes);
        
        // Create simplified vote data for proof
        const voteData = {
            transactionHash: vote.transactionHash,
            nullifier: vote.nullifier,
            electionId: vote.electionId,
            timestamp: vote.timestamp
        };
        
        const proof = tree.getProof(voteData);
        
        if (!proof) {
            return res.status(500).json({ 
                error: 'Failed to generate proof'
            });
        }
        
        res.json({
            transactionHash: transactionHash,
            electionId: electionId,
            proof: proof,
            merkleRoot: tree.getRoot(),
            proofSize: proof.path.length,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error generating Merkle proof',
            message: error.message
        });
    }
});

/**
 * Verify a Merkle proof
 * POST /merkle/verify
 * Body: { vote, proof, merkleRoot }
 */
app.post('/merkle/verify', (req, res) => {
    const { vote, proof, merkleRoot } = req.body;
    
    if (!vote || !proof || !merkleRoot) {
        return res.status(400).json({ 
            error: 'Missing required fields: vote, proof, merkleRoot'
        });
    }
    
    try {
        // Create a temporary tree for verification
        const tempTree = new MerkleTree([vote]);
        const isValid = tempTree.verifyProof(vote, proof, merkleRoot);
        
        res.json({
            valid: isValid,
            merkleRoot: merkleRoot,
            proofSize: proof.path ? proof.path.length : 0,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error verifying Merkle proof',
            message: error.message
        });
    }
});

/**
 * Get Merkle tree statistics for all elections
 * GET /merkle/stats
 */
app.get('/merkle/stats', (req, res) => {
    try {
        const elections = new Set();
        
        // Collect all election IDs from blockchain
        blockchain.chain.forEach(block => {
            if (block.data && Array.isArray(block.data)) {
                block.data.forEach(tx => {
                    if (tx.electionId) {
                        elections.add(tx.electionId);
                    }
                });
            }
        });
        
        const stats = [];
        
        elections.forEach(electionId => {
            const votes = blockchain.getElectionVotes(electionId);
            if (votes.length > 0) {
                const tree = MerkleTree.fromVotes(votes);
                const treeStats = tree.getStats();
                
                stats.push({
                    electionId: electionId,
                    merkleRoot: tree.getRoot(),
                    voteCount: votes.length,
                    treeDepth: treeStats.depth,
                    avgProofSize: treeStats.proofSize
                });
            }
        });
        
        res.json({
            totalElections: stats.length,
            elections: stats,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error calculating Merkle statistics',
            message: error.message
        });
    }
});

/**
 * Batch verify multiple Merkle proofs
 * POST /merkle/batch-verify
 * Body: { items: [{vote, proof}], merkleRoot }
 */
app.post('/merkle/batch-verify', (req, res) => {
    const { items, merkleRoot } = req.body;
    
    if (!items || !Array.isArray(items) || !merkleRoot) {
        return res.status(400).json({ 
            error: 'Missing required fields: items (array), merkleRoot'
        });
    }
    
    try {
        const results = {
            total: items.length,
            valid: 0,
            invalid: 0,
            details: []
        };
        
        items.forEach((item, index) => {
            try {
                const tempTree = new MerkleTree([item.vote]);
                const isValid = tempTree.verifyProof(item.vote, item.proof, merkleRoot);
                
                results.details.push({
                    index: index,
                    transactionHash: item.vote.transactionHash,
                    valid: isValid
                });
                
                if (isValid) {
                    results.valid++;
                } else {
                    results.invalid++;
                }
            } catch (error) {
                results.details.push({
                    index: index,
                    transactionHash: item.vote.transactionHash,
                    valid: false,
                    error: error.message
                });
                results.invalid++;
            }
        });
        
        res.json({
            ...results,
            merkleRoot: merkleRoot,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error in batch verification',
            message: error.message
        });
    }
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
            const delay = connectionIndex * 2000; // Stagger by 2 seconds
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
                    // Connection will retry automatically via exponential backoff
                });
            }, delay);
            connectionIndex++;
        }
    });
    
    // Show peer discovery status after all connections have been attempted
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
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, blockchain, peerManager, nodeMonitor };