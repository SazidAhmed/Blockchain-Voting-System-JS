const express = require("express");
const crypto = require("crypto-js");
const { apiKeyAuth } = require("../../middleware/auth");
const { voteLimiter } = require("../../middleware/rateLimiter");

module.exports = function createVotesRoutes(
  blockchain,
  nodeMonitor,
  metrics,
  peerManager,
  nodeKeyPair,
) {
  const router = express.Router();
  const nodeId = process.env.NODE_ID || "node1";

  router.post("/vote", apiKeyAuth, voteLimiter, (req, res) => {
    const vote = req.body;

    try {
      const voteTimestamp = vote.timestamp || Date.now();
      const txData = JSON.stringify({
        electionId: vote.electionId,
        nullifier: vote.nullifier,
        encryptedBallot: vote.encryptedBallot,
        timestamp: voteTimestamp,
      });
      const transactionHash = crypto.SHA256(txData).toString();

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
      newBlock.signBlock(nodeKeyPair.privateKey);

      if (blockchain.addBlock(newBlock, nodeId, newBlock.signature)) {
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
