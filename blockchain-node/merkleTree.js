const crypto = require('crypto-js');

/**
 * Merkle Tree Implementation for Blockchain Voting System
 * 
 * A Merkle tree (or hash tree) is a tree in which every leaf node is labelled with the 
 * cryptographic hash of a data block, and every non-leaf node is labelled with the 
 * cryptographic hash of the labels of its child nodes.
 * 
 * Benefits:
 * - Efficient verification of data integrity
 * - Minimal proof size (O(log n))
 * - Tamper-proof vote batching
 * - Allows verification without revealing all votes
 */

class MerkleNode {
    /**
     * Creates a new Merkle Tree Node
     * @param {string} hash - The hash value of this node
     * @param {MerkleNode|null} left - Left child node
     * @param {MerkleNode|null} right - Right child node
     */
    constructor(hash, left = null, right = null) {
        this.hash = hash;
        this.left = left;
        this.right = right;
    }

    /**
     * Check if this node is a leaf node (has no children)
     * @returns {boolean}
     */
    isLeaf() {
        return this.left === null && this.right === null;
    }
}

class MerkleTree {
    /**
     * Creates a new Merkle Tree from an array of data
     * @param {Array} data - Array of data items (votes, transactions, etc.)
     */
    constructor(data) {
        if (!data || data.length === 0) {
            throw new Error('Cannot create Merkle tree from empty data');
        }

        this.leaves = [];
        this.root = null;
        this.build(data);
    }

    /**
     * Hash a single piece of data using SHA-256
     * @param {*} data - Data to hash (will be JSON stringified)
     * @returns {string} - Hex string of the hash
     */
    hash(data) {
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        return crypto.SHA256(dataString).toString();
    }

    /**
     * Combine two hashes to create a parent hash
     * @param {string} leftHash - Left child hash
     * @param {string} rightHash - Right child hash
     * @returns {string} - Combined hash
     */
    combineHashes(leftHash, rightHash) {
        return this.hash(leftHash + rightHash);
    }

    /**
     * Build the Merkle tree from data
     * @param {Array} data - Array of data items
     */
    build(data) {
        // Step 1: Create leaf nodes from data
        this.leaves = data.map(item => {
            const itemHash = this.hash(item);
            return new MerkleNode(itemHash);
        });

        // Step 2: Build tree bottom-up
        let currentLevel = this.leaves;

        while (currentLevel.length > 1) {
            const nextLevel = [];

            // Process pairs of nodes
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length 
                    ? currentLevel[i + 1] 
                    : currentLevel[i]; // Duplicate last node if odd number

                const parentHash = this.combineHashes(left.hash, right.hash);
                const parentNode = new MerkleNode(parentHash, left, right);
                nextLevel.push(parentNode);
            }

            currentLevel = nextLevel;
        }

        // Step 3: Set root
        this.root = currentLevel[0];
    }

    /**
     * Get the Merkle root hash
     * @returns {string} - Root hash of the tree
     */
    getRoot() {
        return this.root ? this.root.hash : null;
    }

    /**
     * Generate a Merkle proof for a specific data item
     * @param {*} data - The data item to generate proof for
     * @returns {Object|null} - Proof object containing path and siblings, or null if not found
     */
    getProof(data) {
        const targetHash = this.hash(data);
        const proof = {
            leaf: targetHash,
            path: [], // Array of {hash, position: 'left' | 'right'}
            root: this.getRoot()
        };

        // Find the leaf node index
        const leafIndex = this.leaves.findIndex(leaf => leaf.hash === targetHash);
        if (leafIndex === -1) {
            return null; // Data not found in tree
        }

        // Build proof by traversing from leaf to root
        let currentIndex = leafIndex;
        let currentLevel = this.leaves;

        while (currentLevel.length > 1) {
            const nextLevel = [];
            const proofLevel = [];

            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length 
                    ? currentLevel[i + 1] 
                    : currentLevel[i];

                // If current node is part of the path
                if (i === currentIndex || i + 1 === currentIndex) {
                    if (i === currentIndex) {
                        // Current node is left, sibling is right
                        proofLevel.push({
                            hash: right.hash,
                            position: 'right'
                        });
                    } else {
                        // Current node is right, sibling is left
                        proofLevel.push({
                            hash: left.hash,
                            position: 'left'
                        });
                    }
                }

                const parentHash = this.combineHashes(left.hash, right.hash);
                nextLevel.push(new MerkleNode(parentHash, left, right));
            }

            // Update current index for next level
            currentIndex = Math.floor(currentIndex / 2);
            currentLevel = nextLevel;

            // Add proof level if we found siblings
            if (proofLevel.length > 0) {
                proof.path.push(proofLevel[0]);
            }
        }

        return proof;
    }

    /**
     * Verify a Merkle proof
     * @param {*} data - The original data
     * @param {Object} proof - The proof object from getProof()
     * @param {string} expectedRoot - The expected root hash (optional, uses tree root if not provided)
     * @returns {boolean} - True if proof is valid
     */
    verifyProof(data, proof, expectedRoot = null) {
        if (!proof || !proof.path || !proof.leaf) {
            return false;
        }

        const rootToVerify = expectedRoot || this.getRoot();
        if (!rootToVerify) {
            return false;
        }

        // Start with the leaf hash
        let currentHash = this.hash(data);

        // Verify that the computed leaf hash matches the proof
        if (currentHash !== proof.leaf) {
            return false;
        }

        // Walk up the tree using the proof path
        for (const sibling of proof.path) {
            if (sibling.position === 'left') {
                currentHash = this.combineHashes(sibling.hash, currentHash);
            } else {
                currentHash = this.combineHashes(currentHash, sibling.hash);
            }
        }

        // Verify that we arrived at the expected root
        return currentHash === rootToVerify;
    }

    /**
     * Get the depth of the tree
     * @returns {number} - Tree depth (0 for single node)
     */
    getDepth() {
        const countDepth = (node) => {
            if (!node || node.isLeaf()) {
                return 0;
            }
            return 1 + Math.max(countDepth(node.left), countDepth(node.right));
        };
        return countDepth(this.root);
    }

    /**
     * Get all leaf hashes
     * @returns {Array<string>} - Array of leaf hashes
     */
    getLeaves() {
        return this.leaves.map(leaf => leaf.hash);
    }

    /**
     * Get tree statistics
     * @returns {Object} - Tree statistics
     */
    getStats() {
        return {
            leafCount: this.leaves.length,
            depth: this.getDepth(),
            root: this.getRoot(),
            proofSize: Math.ceil(Math.log2(this.leaves.length)) // Theoretical proof size in hashes
        };
    }

    /**
     * Serialize the tree to JSON (for storage)
     * @returns {Object} - Serialized tree
     */
    toJSON() {
        return {
            root: this.getRoot(),
            leaves: this.getLeaves(),
            leafCount: this.leaves.length,
            depth: this.getDepth(),
            timestamp: Date.now()
        };
    }

    /**
     * Create a tree from serialized JSON
     * @param {Object} json - Serialized tree data
     * @param {Array} originalData - Original data used to create the tree
     * @returns {MerkleTree} - Reconstructed tree
     */
    static fromJSON(json, originalData) {
        if (!originalData || originalData.length !== json.leafCount) {
            throw new Error('Original data required to reconstruct tree');
        }
        return new MerkleTree(originalData);
    }

    /**
     * Create a Merkle tree from vote transactions
     * @param {Array} votes - Array of vote objects
     * @returns {MerkleTree} - Merkle tree containing votes
     */
    static fromVotes(votes) {
        if (!votes || votes.length === 0) {
            throw new Error('Cannot create Merkle tree from empty votes');
        }

        // Create simplified vote data for tree (only essential fields)
        const voteData = votes.map(vote => ({
            transactionHash: vote.transactionHash,
            nullifier: vote.nullifier,
            electionId: vote.electionId,
            timestamp: vote.timestamp
        }));

        return new MerkleTree(voteData);
    }

    /**
     * Batch verify multiple proofs against the same root
     * @param {Array} items - Array of {data, proof} objects
     * @returns {Object} - Verification results
     */
    batchVerify(items) {
        const results = {
            total: items.length,
            valid: 0,
            invalid: 0,
            details: []
        };

        const rootHash = this.getRoot();

        for (const item of items) {
            const isValid = this.verifyProof(item.data, item.proof, rootHash);
            results.details.push({
                data: item.data,
                valid: isValid
            });

            if (isValid) {
                results.valid++;
            } else {
                results.invalid++;
            }
        }

        return results;
    }
}

/**
 * Utility functions for Merkle tree operations
 */
class MerkleTreeUtils {
    /**
     * Create a Merkle tree from an election's votes
     * @param {Array} votes - Array of vote transactions
     * @param {string} electionId - Election ID to filter votes
     * @returns {MerkleTree|null} - Merkle tree or null if no votes
     */
    static createElectionTree(votes, electionId) {
        const electionVotes = votes.filter(v => v.electionId === electionId);
        if (electionVotes.length === 0) {
            return null;
        }
        return MerkleTree.fromVotes(electionVotes);
    }

    /**
     * Verify a vote exists in an election using Merkle proof
     * @param {Object} vote - Vote data
     * @param {Object} proof - Merkle proof
     * @param {string} electionRoot - Election's Merkle root
     * @returns {boolean} - True if vote is verified
     */
    static verifyVoteInElection(vote, proof, electionRoot) {
        const tree = new MerkleTree([vote]); // Temporary tree for verification
        return tree.verifyProof(vote, proof, electionRoot);
    }

    /**
     * Calculate the size savings of using Merkle proofs vs full data
     * @param {number} totalItems - Total number of items in tree
     * @param {number} itemsToVerify - Number of items to verify
     * @returns {Object} - Size comparison
     */
    static calculateSavings(totalItems, itemsToVerify) {
        const fullDataSize = totalItems * 64; // Assume 64 bytes per hash
        const proofSize = itemsToVerify * Math.ceil(Math.log2(totalItems)) * 64;
        const savings = ((fullDataSize - proofSize) / fullDataSize * 100).toFixed(2);

        return {
            fullDataSize: `${fullDataSize} bytes`,
            proofSize: `${proofSize} bytes`,
            savingsPercent: `${savings}%`,
            efficiencyRatio: (fullDataSize / proofSize).toFixed(2)
        };
    }
}

module.exports = {
    MerkleTree,
    MerkleNode,
    MerkleTreeUtils
};
