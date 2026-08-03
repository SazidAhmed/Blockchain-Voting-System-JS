const express = require("express");
const crypto = require("crypto");
const { apiKeyAuth } = require("../../middleware/auth");
const { voteLimiter } = require("../../middleware/rateLimiter");

module.exports = function createVotesRoutes(
  blockchain,
  nodeMonitor,
  metrics,
  peerManager,
  getNodeKeyPair,
) {
  const router = express.Router();
  const nodeId = process.env.NODE_ID || "node1";

  router.post("/vote", apiKeyAuth, voteLimiter, (req, res) => {
    const vote = req.body || {};

    if (
      typeof vote.electionId !== "string" ||
      typeof vote.nullifier !== "string" ||
      typeof vote.encryptedBallot !== "string" ||
      typeof vote.signature !== "string" ||
      typeof vote.publicKey !== "string"
    ) {
      return res.status(400).json({
        message:
          "Missing or invalid vote fields (electionId, nullifier, encryptedBallot, signature, publicKey)",
      });
    }

    try {
      const voteTimestamp = vote.timestamp || Date.now();
      const txData = JSON.stringify({
        electionId: vote.electionId,
        nullifier: vote.nullifier,
        encryptedBallot: vote.encryptedBallot,
        timestamp: voteTimestamp,
      });
      const transactionHash = crypto
        .createHash("sha256")
        .update(txData, "utf8")
        .digest("hex");

      vote.transactionHash = transactionHash;
      vote.timestamp = voteTimestamp;

      const index = blockchain.addVoteTransaction(vote);
      nodeMonitor.recordVoteProcessed();
      metrics.recordVoteProcessed();

      peerManager.broadcastVote(vote);

      res.json({
        message: `Vote will be added to Block ${index}`,
        receipt: {
          transactionHash: transactionHash,
          nullifier: vote.nullifier,
          timestamp: voteTimestamp,
          blockIndex: index,
        },
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  router.post("/transactions/new", apiKeyAuth, (req, res) => {
    const transaction = req.body;

    if (
      !transaction ||
      typeof transaction !== "object" ||
      typeof transaction.fromAddress !== "string" ||
      typeof transaction.toAddress !== "string" ||
      !(typeof transaction.amount === "number" && transaction.amount > 0)
    ) {
      return res.status(400).json({
        message:
          "Transaction body required with fromAddress, toAddress, and numeric amount",
      });
    }

    try {
      const index = blockchain.addTransaction(transaction);
      nodeMonitor.recordTransactionProcessed();
      metrics.recordTransactionProcessed(0);

      peerManager.broadcastMessage({
        type: "TRANSACTION",
        data: transaction,
        timestamp: Date.now(),
      });

      res.json({ message: `Transaction will be added to Block ${index}` });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  router.post("/mine", apiKeyAuth, async (req, res) => {
    try {
      if (blockchain.pendingTransactions.length < 1) {
        return res.json({
          message: "No pending votes",
          pendingCount: 0,
        });
      }
      const { block: newBlock, pendingSnapshot } =
        await blockchain.createBlock(nodeId);
      const nodeKeyPair = getNodeKeyPair();
      if (!nodeKeyPair) {
        return res
          .status(503)
          .json({ message: "Node key not ready, retry shortly" });
      }
      newBlock.signBlock(nodeKeyPair.privateKey);

      if (await blockchain.addBlock(newBlock, nodeId, newBlock.signature)) {
        blockchain.commitBlock(newBlock, pendingSnapshot);
        nodeMonitor.recordBlockProduced(newBlock);
        nodeMonitor.updateChainHeight(blockchain.chain.length);

        metrics.recordBlockCreated(newBlock);

        peerManager.broadcastBlock(newBlock);

        res.json({
          message: "New block forged",
          block: newBlock,
        });
      } else {
        res.status(500).json({ message: "Error adding block to chain" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  return router;
};
