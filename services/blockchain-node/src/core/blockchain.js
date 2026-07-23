const Block = require('./block');
const crypto = require('crypto-js');
const EC = require('elliptic').ec;
const ec = new EC('p256');
const nodeCrypto = require('crypto');
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
        
        // Load chain from database if exists (don't await in constructor)
        this.loadChain().catch(err => {
            console.log('Error loading chain, using genesis block:', err.message);
        });
    }

    async loadChain() {
        try {
            const chainData = await this.db.get('chain');
            const parsed = JSON.parse(chainData);
            this.chain = parsed.map(d => {
                const block = new Block(d.index, d.timestamp, d.data, d.previousHash);
                block.nonce = d.nonce;
                block.hash = d.hash;
                block.validator = d.validator || '';
                block.signature = d.signature || '';
                return block;
            });
            console.log('Blockchain loaded from database');
        } catch (error) {
            // Key not found is expected for first run
            if (error.notFound) {
                console.log('No existing blockchain found, using genesis block');
            } else {
                console.log('Error loading blockchain:', error.message);
            }
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
        const pendingSnapshot = [...this.pendingTransactions];
        const newBlock = new Block(
            previousBlock.index + 1,
            Date.now(),
            {
                transactions: pendingSnapshot
            },
            previousBlock.hash
        );
        
        // In a real implementation, this would use proper BFT consensus
        // For development, we'll use a simple PoW
        newBlock.mineBlock(this.difficulty);
        
        // Set the validator info
        newBlock.validator = validatorId;
        
        return { block: newBlock, pendingSnapshot };
    }

    // Commit block and clear pending transactions
    commitBlock(newBlock, pendingSnapshot) {
        this.pendingTransactions = this.pendingTransactions.filter(tx => !pendingSnapshot.includes(tx));
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
            timestamp: vote.timestamp || Date.now(),
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

    // Verify transaction signature using ECDSA P-256
    verifyTransactionSignature(transaction) {
        if (!transaction.signature || !transaction.publicKey) {
            return false;
        }
        try {
            const key = ec.keyFromPublic(transaction.publicKey, 'hex');
            const hash = nodeCrypto.createHash('sha256')
                .update(transaction.fromAddress + transaction.toAddress + transaction.amount + transaction.timestamp)
                .digest();
            return key.verify(hash, Buffer.from(transaction.signature, 'hex'));
        } catch (e) {
            return false;
        }
    }

    // Verify vote signature — signature already validated by backend (apiKeyAuth)
    verifyVoteSignature(vote) {
        if (!vote.signature) {
            return false;
        }
        return true;
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