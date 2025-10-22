const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto-js');
const http = require('http');
const socketIo = require('socket.io');
const Blockchain = require('./blockchain');
const Block = require('./block');

// Get node ID from environment or use default
const nodeId = process.env.NODE_ID || 'node1';
const PORT = process.env.PORT || 3001;

// Create express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io for P2P communication
const io = socketIo(server);
const sockets = [];

// Initialize blockchain
const blockchain = new Blockchain(nodeId);

// Generate a simple keypair for this node (for development only)
// In production, this would use proper cryptographic key generation
const nodeKeyPair = {
    privateKey: crypto.lib.WordArray.random(32).toString(),
    publicKey: crypto.lib.WordArray.random(32).toString()
};

// Register this node as a validator
blockchain.registerValidator(nodeId, nodeKeyPair.publicKey);

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

// Handle messages from peers
function handleMessage(socket, message) {
    switch (message.type) {
        case 'CHAIN':
            // Handle receiving a blockchain
            const receivedChain = message.data;
            if (receivedChain.length > blockchain.chain.length) {
                console.log('Received chain is longer than current chain. Validating...');
                // In a real implementation, we would validate the received chain
                blockchain.chain = receivedChain;
                blockchain.saveChain();
                console.log('Chain replaced');
            }
            break;
            
        case 'TRANSACTION':
            // Handle receiving a new transaction
            console.log('Received new transaction');
            try {
                blockchain.addTransaction(message.data);
                broadcastMessage({ type: 'TRANSACTION', data: message.data });
            } catch (error) {
                console.error('Error adding transaction:', error.message);
            }
            break;
            
        case 'VOTE':
            // Handle receiving a new vote
            console.log('Received new vote');
            try {
                blockchain.addVoteTransaction(message.data);
                broadcastMessage({ type: 'VOTE', data: message.data });
            } catch (error) {
                console.error('Error adding vote:', error.message);
            }
            break;
            
        case 'MINE':
            // Handle mining request
            console.log('Received mining request');
            const newBlock = blockchain.createBlock(nodeId);
            newBlock.signBlock(nodeKeyPair.privateKey);
            
            if (blockchain.addBlock(newBlock, nodeId, newBlock.signature)) {
                broadcastMessage({ type: 'BLOCK', data: newBlock });
                console.log('New block mined and added to chain');
            }
            break;
            
        case 'BLOCK':
            // Handle receiving a new block
            console.log('Received new block');
            const receivedBlock = message.data;
            if (blockchain.addBlock(receivedBlock, receivedBlock.validator, receivedBlock.signature)) {
                broadcastMessage({ type: 'BLOCK', data: receivedBlock });
                console.log('New block added to chain');
            }
            break;
    }
}

// Broadcast message to all connected peers
function broadcastMessage(message) {
    sockets.forEach(socket => {
        socket.emit('message', message);
    });
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
        validators: Array.from(blockchain.validators.keys()),
        peers: blockchain.nodes.size
    });
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
        broadcastMessage({ type: 'TRANSACTION', data: transaction });
        
        res.json({ message: `Transaction will be added to Block ${index}` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Submit a vote
app.post('/vote', (req, res) => {
    const vote = req.body;
    
    try {
        const index = blockchain.addVoteTransaction(vote);
        broadcastMessage({ type: 'VOTE', data: vote });
        
        res.json({ 
            message: `Vote will be added to Block ${index}`,
            receipt: {
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
        broadcastMessage({ type: 'BLOCK', data: newBlock });
        
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

// Start the server
server.listen(PORT, () => {
    console.log(`Blockchain node server running on port ${PORT}`);
    console.log(`Node ID: ${nodeId}`);
});

// Connect to other nodes if specified
if (process.env.PEERS) {
    const peers = process.env.PEERS.split(',');
    peers.forEach(peer => {
        const socket = require('socket.io-client')(peer);
        sockets.push(socket);
        
        socket.on('connect', () => {
            console.log(`Connected to peer: ${peer}`);
            socket.emit('message', { type: 'CHAIN', data: blockchain.chain });
        });
        
        socket.on('message', (message) => {
            console.log('Received message from peer:', message);
            handleMessage(socket, message);
        });
    });
}