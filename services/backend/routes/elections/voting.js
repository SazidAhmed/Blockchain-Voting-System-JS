const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { pool } = require("../../config/db");
const { auth } = require("../../middleware/auth");
const { voteLimiter } = require("../../middleware/rateLimiter");
const { validateVote } = require("../../middleware/validation");
const { generateToken, verifyECDSASignature } = require("../../utils/signing");
const AuditLogger = require("../../utils/auditLogger");
const auditLogger = new AuditLogger(pool);
const axios = require("axios");
require("dotenv").config();

const blockchainApi = axios.create({
  baseURL: process.env.BLOCKCHAIN_NODE_URL,
});

// Attach API key for blockchain-node requests when configured
const blockchainApiKey = process.env.BLOCKCHAIN_API_KEY;
if (blockchainApiKey) {
  blockchainApi.defaults.headers.common["x-api-key"] = blockchainApiKey;
}

async function mineWithRetry(maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await blockchainApi.post("/mine");
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(
          "Mining failed after",
          maxRetries,
          "attempts:",
          err.message,
        );
      } else {
        console.warn(
          "Mining attempt",
          attempt,
          "failed, retrying in",
          delay,
          "ms",
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
}

// @route   POST /api/elections/:id/register
// @desc    Register to vote in an election
// @access  Private
router.post("/:id/register", auth, async (req, res) => {
  try {
    const electionId = req.params.id;
    const userId = req.user.id;

    // Check if election exists and is in valid state
    const [elections] = await pool.query(
      "SELECT id, status, start_date, end_date FROM elections WHERE id = ?",
      [electionId],
    );

    if (elections.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = elections[0];

    if (election.status !== "pending" && election.status !== "active") {
      return res
        .status(400)
        .json({ message: "Registration is not open for this election" });
    }

    // Check if user is already registered
    const [registrations] = await pool.query(
      "SELECT id, status FROM voter_registrations WHERE user_id = ? AND election_id = ?",
      [userId, electionId],
    );

    if (registrations.length > 0) {
      return res
        .status(400)
        .json({ message: "You are already registered for this election" });
    }

    // Generate registration token (blind token in production)
    const registrationToken = generateToken();

    // Insert registration
    await pool.query(
      "INSERT INTO voter_registrations (user_id, election_id, registration_token, status) VALUES (?, ?, ?, ?)",
      [userId, electionId, registrationToken, "registered"],
    );

    res.status(201).json({
      message: "Successfully registered for election",
      electionId,
      registrationToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/elections/:id/registration-status
// @desc    Check if current user is registered for an election
// @access   Private
router.get("/:id/registration-status", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, status FROM voter_registrations WHERE user_id = ? AND election_id = ?",
      [req.user.id, req.params.id],
    );
    res.json({
      registered: rows.length > 0,
      status: rows.length > 0 ? rows[0].status : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/elections/:id/vote
// @desc    Cast a vote in an election
// @access  Private
router.post("/:id/vote", voteLimiter, auth, validateVote, async (req, res) => {
  try {
    const electionId = req.params.id;
    const userId = req.user.id;
    const {
      encryptedBallot,
      nullifier: clientNullifier,
      signature,
      publicKey,
      timestamp,
    } = req.body;

    if (!encryptedBallot || !clientNullifier || !signature || !publicKey) {
      return res
        .status(400)
        .json({ message: "Please provide encrypted vote package" });
    }

    let decoded;
    try {
      decoded = Buffer.from(encryptedBallot, "base64").toString();
    } catch (e) {
      return res.status(400).json({ error: "Invalid ballot encoding" });
    }
    try {
      JSON.parse(decoded);
      return res.status(400).json({ error: "Plaintext ballots not accepted" });
    } catch (e) {
      // Not JSON — it's encrypted, proceed
    }

    // Check if election exists and is active
    const [elections] = await pool.query(
      "SELECT id, status, end_date, public_key FROM elections WHERE id = ?",
      [electionId],
    );

    if (elections.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = elections[0];

    // Check if election has ended
    const now = new Date();
    const endDate = new Date(election.end_date);

    if (now > endDate) {
      return res.status(403).json({
        message: "Voting has closed for this election",
        reason: "The election end date has passed",
      });
    }

    if (election.status !== "active") {
      return res
        .status(400)
        .json({ message: "Voting is not currently open for this election" });
    }

    // Check if user is registered; will auto-register inside the vote transaction if not
    const [registrations] = await pool.query(
      "SELECT id, status, registration_token FROM voter_registrations WHERE user_id = ? AND election_id = ?",
      [userId, electionId],
    );

    const registration = registrations[0] || null;

    if (registration && registration.status === "voted") {
      await auditLogger.logDoubleVoteAttempt(
        userId,
        electionId,
        { reason: "User already voted", registrationStatus: "voted" },
        req,
      );
      return res
        .status(400)
        .json({ message: "You have already voted in this election" });
    }

    if (registration && registration.status === "revoked") {
      return res
        .status(400)
        .json({ message: "Your registration has been revoked" });
    }

    // Verify the signature
    // IMPORTANT: Use the same data structure as was signed on the client
    // The client signs electionId as a string (from route param), not an integer
    const voteData = {
      encryptedBallot,
      nullifier: clientNullifier,
      electionId: electionId, // Keep as string to match frontend signature
      timestamp,
    };

    const isValidSignature = verifyECDSASignature(
      publicKey,
      signature,
      voteData,
    );

    await auditLogger.logSignatureVerification(
      userId,
      electionId,
      isValidSignature,
      {
        signatureLength: signature?.length,
        publicKeyLength: publicKey?.length,
        nullifierPreview: clientNullifier?.substring(0, 16),
      },
      req,
    );

    if (!isValidSignature) {
      console.error("Invalid signature for vote");
      return res.status(400).json({ message: "Invalid vote signature" });
    }

    const voteTimestamp = timestamp || Date.now();

    // Submit vote to blockchain — fail closed if the node is unreachable (H-09)
    let blockchainResponse;
    try {
      const response = await blockchainApi.post("/vote", {
        voterId: userId,
        electionId,
        encryptedBallot,
        nullifier: clientNullifier,
        signature,
        publicKey,
        timestamp: voteTimestamp,
      });
      blockchainResponse = response;
    } catch (blockchainError) {
      console.error(
        "Blockchain node unreachable, rejecting vote:",
        blockchainError.message,
      );
      return res.status(503).json({
        message: "Voting service temporarily unavailable, please retry",
      });
    }

    const receipt = blockchainResponse.data.receipt || {};
    const transactionHash = receipt.transactionHash;
    const blockIndex = receipt.blockIndex || 0;

    const connection = await pool.getConnection();
    let finalTransactionHash = transactionHash;
    try {
      await connection.beginTransaction();

      let registrationId = registration?.id;
      if (!registrationId) {
        const registrationToken = crypto.randomBytes(32).toString("hex");
        const [insertResult] = await connection.query(
          "INSERT INTO voter_registrations (user_id, election_id, registration_token, status) VALUES (?, ?, ?, ?)",
          [userId, electionId, registrationToken, "registered"],
        );
        registrationId = insertResult.insertId;
      }

      await connection.query(
        "UPDATE voter_registrations SET status = ? WHERE id = ?",
        ["voted", registrationId],
      );

      try {
        await connection.query(
          "INSERT INTO votes_meta (tx_hash, block_index, election_id, nullifier_hash, encrypted_ballot, signature, voter_public_key) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            transactionHash,
            blockIndex,
            electionId,
            clientNullifier,
            encryptedBallot,
            signature,
            publicKey,
          ],
        );
      } catch (insertErr) {
        if (insertErr.code === "ER_DUP_ENTRY") {
          await connection.rollback();
          await auditLogger.logDoubleVoteAttempt(
            userId,
            electionId,
            {
              reason: "Duplicate nullifier detected",
              nullifier: clientNullifier.substring(0, 16) + "...",
            },
            req,
          );
          return res.status(400).json({
            message:
              "This nullifier has already been used (possible double-vote attempt)",
          });
        }
        throw insertErr;
      }

      await connection.query(
        "INSERT INTO vote_receipts (election_id, nullifier_hash, transaction_hash) VALUES (?, ?, ?)",
        [electionId, clientNullifier, transactionHash],
      );

      await connection.commit();
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }

    // Auto-mine the pending vote into a block immediately (L-01)
    await mineWithRetry();

    // Log successful vote
    await auditLogger.logVote(
      userId,
      electionId,
      true,
      {
        transactionHash: transactionHash.substring(0, 16) + "...",
        blockIndex,
        nullifier: clientNullifier.substring(0, 16) + "...",
        encryptionUsed: "client-side",
      },
      req,
    );

    // Return an opaque receipt ID — never expose the nullifier (H-02)
    const receiptId = crypto
      .createHash("sha256")
      .update(transactionHash)
      .digest("hex")
      .substring(0, 16);

    res.json({
      message: "Vote cast successfully",
      receipt: {
        receiptId,
        transactionHash,
        blockIndex,
        timestamp: receipt.timestamp || voteTimestamp,
      },
    });
  } catch (err) {
    console.error(err);

    // Log failed vote attempt
    await auditLogger.logVote(
      req.user?.id,
      req.params.id,
      false,
      {
        error: err.message,
        errorType: err.code || "UNKNOWN",
      },
      req,
    );

    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
