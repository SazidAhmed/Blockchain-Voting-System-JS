const Block = require('./block');
const crypto = require('crypto-js');
const level = require('levelup');
const leveldown = require('leveldown');

class Blockchain {
    constructor(nodeId = 'node1') {
        this.chain = [];
        this.pendingTransactions = [];
        this.difficulty = 2;
        this.miningReward = 0;
        this.nodeId = nodeId;
        this.nodes = new Set(); // Connected nodes
        this.validators = new Map(); // Map of validator nodeId -> public key
        
        // Create genesis block
        this.createGenesisBlock();
        
        // Initialize database for persistence
        this.db = level(leveldown(`./data/${nodeId}`));
        
        // Load chain from database if exists
        this.loadChain();
    }

    async loadChain() {
        try {
            const chainData = await this.db.get('chain');
            this.chain = JSON.parse(chainData);
            console.log('Blockchain loaded from database');
        } catch (error) {
            console.log('No existing blockchain found, using genesis block');
        }
    }

    async saveChain() {
        try {
            await this.db.put('chain', JSON.stringify(this.chain));
            console.log('Blockchain saved to database');
        } catch (error) {
            console.error('Error saving blockchain:', error);
        }
    }

    createGenesisBlock() {
        const genesisBlock = new Block(0, Date.now(), { 
            message: "Genesis Block",
            transactions: []
        }, "0");
        this.chain.push(genesisBlock);
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    // For PoA/BFT consensus
    addBlock(newBlock, validatorId, signature) {
        // Verify the block is valid
        if (!this.isValidNewBlock(newBlock)) {
            return false;
        }
        
        // In a real BFT implementation, we would verify signatures from multiple validators
        // For now, we'll just check if the validator is registered
        if (!this.validators.has(validatorId)) {
            console.log('Invalid validator');
            return false;
        }
        
        // Add the block to the chain
        this.chain.push(newBlock);
        this.saveChain();
        return true;
    }

    // Create a new block with pending transactions
    createBlock(validatorId) {
        const previousBlock = this.getLatestBlock();
        const newBlock = new Block(
            previousBlock.index + 1,
            Date.now(),
            {
                transactions: this.pendingTransactions
            },
            previousBlock.hash
        );
        
        // In a real implementation, this would use proper BFT consensus
        // For development, we'll use a simple PoW
        newBlock.mineBlock(this.difficulty);
        
        // Set the validator info
        newBlock.validator = validatorId;
        
        // Clear pending transactions
        this.pendingTransactions = [];
        
        return newBlock;
    }

    // Add a new transaction to pending transactions
    addTransaction(transaction) {
        // Validate transaction
        if (!transaction.fromAddress || !transaction.toAddress || !transaction.amount) {
            throw new Error('Transaction must include from, to, and amount');
        }
        
        // Verify signature
        if (!this.verifyTransactionSignature(transaction)) {
            throw new Error('Cannot add invalid transaction to chain');
        }
        
        // Add to pending transactions
        this.pendingTransactions.push(transaction);
        return this.getLatestBlock().index + 1;
    }

    // For voting system - add a vote transaction
    addVoteTransaction(vote) {
        // Validate vote transaction
        if (!vote.voterId || !vote.electionId || !vote.encryptedBallot || !vote.nullifier) {
            throw new Error('Vote must include voterId, electionId, encryptedBallot, and nullifier');
        }
        
        // Check if nullifier has been used before (prevent double voting)
        if (this.isNullifierUsed(vote.nullifier)) {
            throw new Error('Vote nullifier has already been used');
        }
        
        // Verify vote signature
        if (!this.verifyVoteSignature(vote)) {
            throw new Error('Cannot add invalid vote to chain');
        }
        
        // Add to pending transactions
        this.pendingTransactions.push({
            type: 'VOTE',
            electionId: vote.electionId,
            encryptedBallot: vote.encryptedBallot,
            nullifier: vote.nullifier,
            timestamp: Date.now(),
            signature: vote.signature
        });
        
        return this.getLatestBlock().index + 1;
    }

    // Check if a nullifier has been used in any block
    isNullifierUsed(nullifier) {
        for (const block of this.chain) {
            if (block.data && block.data.transactions) {
                for (const tx of block.data.transactions) {
                    if (tx.type === 'VOTE' && tx.nullifier === nullifier) {
                        return true;
                    }
                }
            }
        }
        
        // Also check pending transactions
        for (const tx of this.pendingTransactions) {
            if (tx.type === 'VOTE' && tx.nullifier === nullifier) {
                return true;
            }
        }
        
        return false;
    }

    // Verify transaction signature
    verifyTransactionSignature(transaction) {
        // In a real implementation, this would verify cryptographic signatures
        // For now, we'll simulate it
        if (!transaction.signature) {
            return false;
        }
        
        // Simple simulation of signature verification
        const txHash = crypto.SHA256(
            transaction.fromAddress + 
            transaction.toAddress + 
            transaction.amount
        ).toString();
        
        // In reality, we would verify the signature using the sender's public key
        return true; // Simplified for development
    }

    // Verify vote signature
    verifyVoteSignature(vote) {
        // In a real implementation, this would verify cryptographic signatures
        // For now, we'll simulate it
        if (!vote.signature) {
            return false;
        }
        
        // Simple simulation of signature verification
        const voteHash = crypto.SHA256(
            vote.voterId + 
            vote.electionId + 
            vote.encryptedBallot +
            vote.nullifier
        ).toString();
        
        // In reality, we would verify the signature using the voter's public key
        return true; // Simplified for development
    }

    // Validate the chain
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            
            // Check hash
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }
            
            // Check previous hash reference
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        
        return true;
    }

    // Validate a new block before adding it
    isValidNewBlock(newBlock) {
        const previousBlock = this.getLatestBlock();
        
        // Check index
        if (previousBlock.index + 1 !== newBlock.index) {
            console.log('Invalid index');
            return false;
        }
        
        // Check previous hash
        if (previousBlock.hash !== newBlock.previousHash) {
            console.log('Invalid previous hash');
            return false;
        }
        
        // Check block's hash
        if (newBlock.hash !== newBlock.calculateHash()) {
            console.log('Invalid hash');
            return false;
        }
        
        return true;
    }

    // Register a new validator node
    registerValidator(nodeId, publicKey) {
        this.validators.set(nodeId, publicKey);
    }

    // Remove a validator node
    removeValidator(nodeId) {
        this.validators.delete(nodeId);
    }

    // Register a peer node
    registerNode(address) {
        this.nodes.add(address);
    }

    // Consensus algorithm - resolve conflicts between nodes
    // In a real BFT implementation, this would be more complex
    async resolveConflicts() {
        const neighbors = Array.from(this.nodes);
        let newChain = null;
        let maxLength = this.chain.length;
        
        // For development, we'll use a simple longest chain rule
        // In production, this would be replaced with proper BFT consensus
        
        // Simplified for development - in reality, would fetch chains from other nodes
        if (newChain) {
            this.chain = newChain;
            this.saveChain();
            return true;
        }
        
        return false;
    }

    // Get all votes for a specific election
    getElectionVotes(electionId) {
        const votes = [];
        
        for (const block of this.chain) {
            if (block.data && block.data.transactions) {
                for (const tx of block.data.transactions) {
                    if (tx.type === 'VOTE' && tx.electionId === electionId) {
                        votes.push(tx);
                    }
                }
            }
        }
        
        return votes;
    }
}

module.exports = Blockchain;