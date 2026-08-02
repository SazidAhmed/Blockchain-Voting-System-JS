const crypto = require("crypto");
const EC = require("elliptic").ec;
const ec = new EC("p256");
const { MerkleTree } = require("./merkleTree");

class Block {
  constructor(index, timestamp, data, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.validator = ""; // The node that validated this block
    this.signature = ""; // Signature of the validator

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
    if (
      !this.data ||
      !this.data.transactions ||
      !Array.isArray(this.data.transactions) ||
      this.data.transactions.length === 0
    ) {
      return null;
    }
    try {
      const tree = new MerkleTree(this.data.transactions);
      return tree.getRoot();
    } catch (error) {
      console.error("Error calculating Merkle root:", error.message);
      return null;
    }
  }

  calculateHash() {
    return crypto
      .createHash("sha256")
      .update(
        this.index +
          this.timestamp +
          JSON.stringify(this.data) +
          this.previousHash +
          this.nonce +
          (this.merkleRoot || ""),
      )
      .digest("hex");
  }

  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join("0");
    return new Promise((resolve) => {
      const tryNonce = () => {
        this.hash = this.calculateHash();
        if (this.hash.substring(0, difficulty) === target) {
          console.log(`Block mined: ${this.hash}`);
          resolve();
        } else {
          this.nonce++;
          setImmediate(tryNonce);
        }
      };
      tryNonce();
    });
  }

  signBlock(privateKey) {
    const key = ec.keyFromPrivate(privateKey, "hex");
    const hash = require("crypto")
      .createHash("sha256")
      .update(this.hash, "utf8")
      .digest();
    const sig = key.sign(hash);
    this.signature = Buffer.from(
      sig.r.toString("hex", 32) + sig.s.toString("hex", 32),
      "hex",
    ).toString("base64");
    return this.signature;
  }

  verifySignature(key) {
    try {
      const ecKey = ec.keyFromPublic(key, "hex");
      const hash = require("crypto")
        .createHash("sha256")
        .update(this.hash, "utf8")
        .digest();
      const sigBuf = Buffer.from(this.signature, "base64");
      const r = sigBuf.slice(0, 32).toString("hex");
      const s = sigBuf.slice(32, 64).toString("hex");
      return ecKey.verify(hash, { r, s });
    } catch (e) {
      return false;
    }
  }
}

module.exports = Block;
