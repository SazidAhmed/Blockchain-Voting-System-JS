const express = require('express');

module.exports = function createChainRoutes(blockchain, nodeMonitor, peerManager) {
    const router = express.Router();

    router.get('/chain', (req, res) => {
        res.json({
            chain: JSON.parse(JSON.stringify(blockchain.chain)),
            length: blockchain.chain.length
        });
    });

    router.get('/node', (req, res) => {
        res.json({
            nodeId: process.env.NODE_ID || 'node1',
            nodeType: process.env.NODE_TYPE || 'validator',
            validators: Array.from(blockchain.validators.keys()),
            peers: blockchain.nodes.size
        });
    });

    router.get('/node/status', (req, res) => {
        res.json(nodeMonitor.getNodeStatus());
    });

    router.get('/network/status', (req, res) => {
        res.json(nodeMonitor.getNetworkStatus(peerManager, blockchain));
    });

    return router;
};
