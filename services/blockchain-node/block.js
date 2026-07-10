const crypto = require('crypto-js');
const { MerkleTree } = require('./merkleTree');

class Block {
    constructor(index, timestamp, data, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.validator = ''; // The node that validated this block
        this.signature = ''; // Signature of the validator
        
        // Merkle tree for data integrity
        this.merkleRoot = this.calculateMerkleRoot();
        
        // Hash must be calculated after merkleRoot
        this.hash = this.calculateHash();
    }

    /**
     * Calculate Merkle root from block data
     * @returns {string|null} - Merkle root hash or null if no data
     */
    calculateMerkleRoot() {
        if (!this.data) {
            return null;
        }

        // Ensure data is an array
        const dataArray = Array.isArray(this.data) ? this.data : [this.data];
        
        if (dataArray.length === 0) {
            return null;
        }

        try {
            const tree = new MerkleTree(dataArray);
            return tree.getRoot();
        } catch (error) {
            console.error('Error calculating Merkle root:', error.message);
            return null;
        }
    }

    calculateHash() {
        return crypto.SHA256(
            this.index + 
            this.timestamp + 
            JSON.stringify(this.data) + 
            this.previousHash + 
            this.nonce +
            (this.merkleRoot || '')
        ).toString();
    }

    // Simple proof of work for development purposes
    // In production, this would be replaced with BFT consensus
    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`Block mined: ${this.hash}`);
    }

    // For BFT consensus, blocks are signed by validators
    signBlock(privateKey) {
        // In a real implementation, this would use proper cryptographic signing
        // For now, we'll simulate it
        this.signature = crypto.HmacSHA256(this.hash, privateKey).toString();
        return this.signature;
    }

    // Verify the block signature
    verifySignature(publicKey) {
        // In a real implementation, this would verify the signature cryptographically
        // For now, we'll simulate it
        const expectedSignature = crypto.HmacSHA256(this.hash, publicKey).toString();
        return this.signature === expectedSignature;
    }
}

module.exports = Block;