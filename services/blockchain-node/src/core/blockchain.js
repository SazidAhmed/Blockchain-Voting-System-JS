const Block = require("./block");

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

    // Initialize database for persistence
    this.db = level(leveldown(`./data/${nodeId}`));

    this.ready = this.init();

    // Create genesis block
    this.createGenesisBlock();
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
    return this.loadChain();
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

    // Add the block to the chain
    this.chain.push(newBlock);
    this.saveChain();
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

    this.pendingTransactions.push({
      type: "VOTE",
      electionId: vote.electionId,
      encryptedBallot: vote.encryptedBallot,
      nullifier: vote.nullifier,
      transactionHash: vote.transactionHash || "",
      timestamp: vote.timestamp || Date.now(),
      signature: vote.signature,
      publicKey: vote.publicKey || "",
      voterId: vote.voterId || null,
    });

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
      const publicKeyDer = Buffer.from(vote.publicKey, "base64");
      let keyStart = -1;
      for (let i = 0; i < publicKeyDer.length - 65; i++) {
        if (
          publicKeyDer[i] === 0x03 &&
          publicKeyDer[i + 2] === 0x00 &&
          publicKeyDer[i + 3] === 0x04
        ) {
          keyStart = i + 3;
          break;
        }
      }
      if (keyStart === -1) return false;
      if (publicKeyDer[keyStart] !== 0x04) return false;
      const xHex = publicKeyDer
        .slice(keyStart + 1, keyStart + 33)
        .toString("hex");
      const yHex = publicKeyDer
        .slice(keyStart + 33, keyStart + 65)
        .toString("hex");
      const key = ec.keyFromPublic({ x: xHex, y: yHex }, "hex");
      const dataStr = JSON.stringify({
        encryptedBallot: vote.encryptedBallot,
        nullifier: vote.nullifier,
        electionId: vote.electionId,
        timestamp: vote.timestamp,
      });
      const hash = nodeCrypto
        .createHash("sha256")
        .update(dataStr, "utf8")
        .digest();
      const sigBuf = Buffer.from(vote.signature, "base64");
      if (sigBuf.length !== 64) return false;
      const r = sigBuf.slice(0, 32).toString("hex");
      const s = sigBuf.slice(32, 64).toString("hex");
      return key.verify(hash, { r, s });
    } catch (e) {
      return false;
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
    const votes = [];

    for (const block of this.chain) {
      if (block.data && block.data.transactions) {
        for (const tx of block.data.transactions) {
          if (tx.type === "VOTE" && tx.electionId === electionId) {
            votes.push(tx);
          }
        }
      }
    }

    return votes;
  }
}

module.exports = Blockchain;
