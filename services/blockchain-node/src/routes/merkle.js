const express = require('express');
const { MerkleTree } = require('../core/merkleTree');

module.exports = function createMerkleRoutes(blockchain) {
    const router = express.Router();

    router.get('/merkle/block/:blockIndex', (req, res) => {
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

    router.get('/merkle/election/:electionId', (req, res) => {
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

    router.post('/merkle/proof', (req, res) => {
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

            const vote = votes.find(v => v.transactionHash === transactionHash);

            if (!vote) {
                return res.status(404).json({
                    error: 'Vote not found in election',
                    transactionHash: transactionHash
                });
            }

            const tree = MerkleTree.fromVotes(votes);

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

    router.post('/merkle/verify', (req, res) => {
        const { vote, proof, merkleRoot } = req.body;

        if (!vote || !proof || !merkleRoot) {
            return res.status(400).json({
                error: 'Missing required fields: vote, proof, merkleRoot'
            });
        }

        try {
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

    router.get('/merkle/stats', (req, res) => {
        try {
            const elections = new Set();

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

    router.post('/merkle/batch-verify', (req, res) => {
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

    return router;
};
