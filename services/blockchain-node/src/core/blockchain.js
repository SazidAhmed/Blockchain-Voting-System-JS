const Block = require("./block");
const { verifyECDSASignature, canonicalJson } = require("./signature");

const EC = require("elliptic").ec;
const ec = new EC("p256");
const nodeCrypto = require("crypto");
const level = require("levelup");
const leveldown = require("leveldown");

class Blockchain {
  constructor(nodeId = "node1") {
    this.chain = [];
    this.pendingTransactions = [];
    this.difficulty = 2;
    this.miningReward = 0;
    this.nodeId = nodeId;
    this.nodes = new Set();
    this.validators = new Map();
    this.usedNullifiers = new Set();
    this.electionVoteIndex = new Map();

    // Initialize database for persistence
    this.db = level(leveldown(`./data/${nodeId}`));

    this.ready = this.init();
  }

  async loadChain() {
    try {
      const chainData = await this.db.get("chain");
      const parsed = JSON.parse(chainData);
      this.chain = parsed.map((d) => {
        const block = new Block(d.index, d.timestamp, d.data, d.previousHash);
        block.nonce = d.nonce;
        block.hash = d.hash;
        block.validator = d.validator || "";
        block.signature = d.signature || "";
        return block;
      });
      console.log("Blockchain loaded from database");
    } catch (error) {
      // Key not found is expected for first run
      if (error.notFound) {
        console.log("No existing blockchain found, using genesis block");
      } else {
        console.log("Error loading blockchain:", error.message);
      }
    }
  }

  async init() {
    await this.loadChain();
    if (this.chain.length === 0) {
      this.createGenesisBlock();
    }
    this.rebuildVoteIndex();
  }

  rebuildVoteIndex() {
    this.electionVoteIndex = new Map();
    for (const block of this.chain) {
      if (block.data && block.data.transactions) {
        for (const tx of block.data.transactions) {
          if (tx.type === "VOTE" && tx.electionId) {
            if (!this.electionVoteIndex.has(tx.electionId)) {
              this.electionVoteIndex.set(tx.electionId, []);
            }
            this.electionVoteIndex.get(tx.electionId).push(tx);
          }
        }
      }
    }
  }

  async saveChain() {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.ready;
        await this.db.put("chain", JSON.stringify(this.chain));
        console.log("Blockchain saved to database");
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
        }
      }
    }
    console.error("Error saving blockchain after 3 attempts:", lastError);
  }

  createGenesisBlock() {
    const genesisBlock = new Block(
      0,
      Date.now(),
      {
        message: "Genesis Block",
        transactions: [],
      },
      "0",
    );
    this.chain.push(genesisBlock);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // For PoA/BFT consensus
  async addBlock(newBlock, validatorId, signature) {
    await this.ready;
    // Verify the block is valid
    if (!this.isValidNewBlock(newBlock)) {
      return false;
    }

    // In a real BFT implementation, we would verify signatures from multiple validators
    // For now, we'll just check if the validator is registered
    if (!this.validators.has(validatorId)) {
      console.log("Invalid validator");
      return false;
    }

    // Verify the validator's signature on the block (H-18)
    const validatorKey = this.validators.get(validatorId);
    if (
      !newBlock.signature ||
      !validatorKey ||
      !newBlock.verifySignature(validatorKey)
    ) {
      console.log("Invalid block signature");
      return false;
    }

    // Add the block to the chain
    this.chain.push(newBlock);
    await this.saveChain();
    this.rebuildVoteIndex();
    return true;
  }

  // Create a new block with pending transactions
  async createBlock(validatorId) {
    await this.ready;
    const previousBlock = this.getLatestBlock();
    const pendingSnapshot = [...this.pendingTransactions];
    const newBlock = new Block(
      previousBlock.index + 1,
      Date.now(),
      {
        transactions: pendingSnapshot,
      },
      previousBlock.hash,
    );

    await newBlock.mineBlock(this.difficulty);

    newBlock.validator = validatorId;

    return { block: newBlock, pendingSnapshot };
  }

  // Commit block and clear pending transactions
  async commitBlock(newBlock, pendingSnapshot) {
    await this.ready;
    this.pendingTransactions = this.pendingTransactions.filter(
      (tx) => !pendingSnapshot.includes(tx),
    );
  }

  // Add a new transaction to pending transactions
  addTransaction(transaction) {
    // Validate transaction
    if (
      !transaction.fromAddress ||
      !transaction.toAddress ||
      !transaction.amount
    ) {
      throw new Error("Transaction must include from, to, and amount");
    }

    // Verify signature
    if (!this.verifyTransactionSignature(transaction)) {
      throw new Error("Cannot add invalid transaction to chain");
    }

    // Add to pending transactions
    this.pendingTransactions.push(transaction);
    return this.getLatestBlock().index + 1;
  }

  // For voting system - add a vote transaction
  addVoteTransaction(vote) {
    // Validate vote transaction
    if (
      !vote.voterId ||
      !vote.electionId ||
      !vote.encryptedBallot ||
      !vote.nullifier
    ) {
      throw new Error(
        "Vote must include voterId, electionId, encryptedBallot, and nullifier",
      );
    }

    if (this.usedNullifiers.has(vote.nullifier)) {
      throw new Error("Vote nullifier has already been used");
    }

    // Verify vote signature
    if (!this.verifyVoteSignature(vote)) {
      throw new Error("Cannot add invalid vote to chain");
    }

    this.usedNullifiers.add(vote.nullifier);

    const tx = {
      type: "VOTE",
      electionId: vote.electionId,
      encryptedBallot: vote.encryptedBallot,
      nullifier: vote.nullifier,
      transactionHash: vote.transactionHash || "",
      timestamp: vote.timestamp || Date.now(),
      signature: vote.signature,
      publicKey: vote.publicKey || "",
      voterId: vote.voterId || null,
    };

    this.pendingTransactions.push(tx);

    return this.getLatestBlock().index + 1;
  }

  isNullifierUsed(nullifier) {
    return this.usedNullifiers.has(nullifier);
  }

  // Verify transaction signature using ECDSA P-256
  verifyTransactionSignature(transaction) {
    if (!transaction.signature || !transaction.publicKey) {
      return false;
    }
    try {
      const key = ec.keyFromPublic(transaction.publicKey, "hex");
      const hash = nodeCrypto
        .createHash("sha256")
        .update(
          transaction.fromAddress +
            transaction.toAddress +
            transaction.amount +
            transaction.timestamp,
        )
        .digest();
      return key.verify(hash, Buffer.from(transaction.signature, "hex"));
    } catch (e) {
      return false;
    }
  }

  verifyVoteSignature(vote) {
    if (!vote.signature || !vote.publicKey) {
      return false;
    }
    try {
      const canonicalData = JSON.stringify(
        {
          encryptedBallot: vote.encryptedBallot,
          nullifier: vote.nullifier,
          electionId: vote.electionId,
          timestamp: vote.timestamp,
        },
        Object.keys({
          encryptedBallot: vote.encryptedBallot,
          nullifier: vote.nullifier,
          electionId: vote.electionId,
          timestamp: vote.timestamp,
        }).sort(),
      );
      return verifyECDSASignature(
        vote.publicKey,
        vote.signature,
        canonicalData,
      );
    } catch (e) {
      return false;
    }
  }

  // Persist this node's ECDSA keypair to the database
  async getOrCreateNodeKey() {
    await this.ready;
    try {
      const saved = await this.db.get("nodeKeyPair");
      return JSON.parse(saved);
    } catch (err) {
      if (!err.notFound) throw err;
      const key = ec.genKeyPair();
      const keyPair = {
        privateKey: key.getPrivate("hex"),
        publicKey: key.getPublic("hex"),
      };
      await this.db.put("nodeKeyPair", JSON.stringify(keyPair));
      console.log("Generated and persisted new node keypair");
      return keyPair;
    }
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      const target = Array(this.difficulty + 1).join("0");
      if (currentBlock.hash.substring(0, this.difficulty) !== target) {
        return false;
      }

      if (currentBlock.merkleRoot !== currentBlock.calculateMerkleRoot()) {
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
      console.log("Invalid index");
      return false;
    }

    // Check previous hash
    if (previousBlock.hash !== newBlock.previousHash) {
      console.log("Invalid previous hash");
      return false;
    }

    // Check block's hash
    if (newBlock.hash !== newBlock.calculateHash()) {
      console.log("Invalid hash");
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
    return this.electionVoteIndex.get(electionId) || [];
  }
}

module.exports = Blockchain;
