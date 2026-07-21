const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../../config/db');
const { auth } = require('../../middleware/auth');
const { voteLimiter } = require('../../middleware/rateLimiter');
const { validateVote } = require('../../middleware/validation');
const { generateToken, generateNullifier, encryptBallot, signData, verifyECDSASignature } = require('../../utils/signing');
const auditLogger = require('../../utils/auditLogger');
const axios = require('axios');
require('dotenv').config();

const blockchainApi = axios.create({
  baseURL: process.env.BLOCKCHAIN_NODE_URL
});

// @route   POST /api/elections/:id/register
// @desc    Register to vote in an election
// @access  Private
router.post('/:id/register', auth, async (req, res) => {
  try {
    const electionId = req.params.id;
    const userId = req.user.id;

    // Check if election exists and is in valid state
    const [elections] = await pool.query(
      'SELECT id, status, start_date, end_date FROM elections WHERE id = ?',
      [electionId]
    );

    if (elections.length === 0) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const election = elections[0];

    if (election.status !== 'pending' && election.status !== 'active') {
      return res.status(400).json({ message: 'Registration is not open for this election' });
    }

    // Check if user is already registered
    const [registrations] = await pool.query(
      'SELECT id, status FROM voter_registrations WHERE user_id = ? AND election_id = ?',
      [userId, electionId]
    );

    if (registrations.length > 0) {
      return res.status(400).json({ message: 'You are already registered for this election' });
    }

    // Generate registration token (blind token in production)
    const registrationToken = generateToken();

    // Insert registration
    await pool.query(
      'INSERT INTO voter_registrations (user_id, election_id, registration_token, status) VALUES (?, ?, ?, ?)',
      [userId, electionId, registrationToken, 'registered']
    );

    res.status(201).json({
      message: 'Successfully registered for election',
      electionId,
      registrationToken
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/elections/:id/registration-status
// @desc    Check if current user is registered for an election
// @access   Private
router.get('/:id/registration-status', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, status FROM voter_registrations WHERE user_id = ? AND election_id = ?',
      [req.user.id, req.params.id]
    );
    res.json({ registered: rows.length > 0, status: rows.length > 0 ? rows[0].status : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/elections/:id/vote
// @desc    Cast a vote in an election
// @access  Private
router.post('/:id/vote', voteLimiter, auth, validateVote, async (req, res) => {
  try {
    const electionId = req.params.id;
    const userId = req.user.id;
    const { 
      candidateId, 
      privateKey,          // Legacy mode
      encryptedBallot,     // New: encrypted ballot from client
      signature,           // New: ECDSA signature
      publicKey,           // New: public key for verification
      timestamp            // New: timestamp from client
    } = req.body;

    // Server-side nullifier derivation (prevents client from generating multiple nullifiers)
    const nullifier = generateNullifier(userId.toString(), electionId.toString(), process.env.JWT_SECRET);

    // Reject base64-encoded plaintext ballots
    if (encryptedBallot) {
      try {
        JSON.parse(Buffer.from(encryptedBallot, "base64").toString());
        return res.status(400).json({ error: "Plaintext ballots not accepted" });
      } catch (e) {
        // Not base64 JSON — proceed (it's encrypted)
      }
    }

    // Determine if this is a new crypto flow or legacy flow
    const isNewCryptoFlow = encryptedBallot && nullifier && signature && publicKey;

    if (!isNewCryptoFlow && (!candidateId || !privateKey)) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (isNewCryptoFlow && (!encryptedBallot || !nullifier || !signature || !publicKey)) {
      return res.status(400).json({ message: 'Please provide encrypted vote package' });
    }

    // Check if election exists and is active
    const [elections] = await pool.query(
      'SELECT id, status, end_date, public_key FROM elections WHERE id = ?',
      [electionId]
    );

    if (elections.length === 0) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const election = elections[0];

    // Check if election has ended
    const now = new Date();
    const endDate = new Date(election.end_date);
    
    if (now > endDate) {
      return res.status(403).json({ 
        message: 'Voting has closed for this election',
        reason: 'The election end date has passed'
      });
    }

    if (election.status !== 'active') {
      return res.status(400).json({ message: 'Voting is not currently open for this election' });
    }

    // Check if user is registered; auto-register if not (any verified user can vote in any active election)
    const [registrations] = await pool.query(
      'SELECT id, status, registration_token FROM voter_registrations WHERE user_id = ? AND election_id = ?',
      [userId, electionId]
    );

    let registration;
    if (registrations.length === 0) {
      // Auto-register the user for this election now
      const registrationToken = crypto.randomBytes(32).toString('hex');
      const [insertResult] = await pool.query(
        'INSERT INTO voter_registrations (user_id, election_id, registration_token, status) VALUES (?, ?, ?, ?)',
        [userId, electionId, registrationToken, 'registered']
      );
      registration = { id: insertResult.insertId, status: 'registered', registration_token: registrationToken };
    } else {
      registration = registrations[0];
    }

    if (registration.status === 'voted') {
      // Log double-vote attempt
      await auditLogger.logDoubleVoteAttempt(
        userId, 
        electionId, 
        { reason: 'User already voted', registrationStatus: 'voted' },
        req
      );
      return res.status(400).json({ message: 'You have already voted in this election' });
    }

    if (registration.status === 'revoked') {
      return res.status(400).json({ message: 'Your registration has been revoked' });
    }

    let finalEncryptedBallot, finalNullifier, finalSignature, finalPublicKey;

    if (isNewCryptoFlow) {
      // NEW CRYPTO FLOW - Client-side encryption and signing
      console.log('Processing vote with client-side cryptography');
      
      // Verify the signature
      // IMPORTANT: Use the same data structure as was signed on the client
      // The client signs electionId as a string (from route param), not an integer
      const voteData = {
        encryptedBallot,
        nullifier,
        electionId: electionId, // Keep as string to match frontend signature
        timestamp
      };
      
      const isValidSignature = verifyECDSASignature(publicKey, signature, voteData);
      
      // Log signature verification
      await auditLogger.logSignatureVerification(
        userId,
        electionId,
        isValidSignature,
        { 
          signatureLength: signature?.length,
          publicKeyLength: publicKey?.length,
          nullifierPreview: nullifier?.substring(0, 16)
        },
        req
      );
      
      if (!isValidSignature) {
        console.error('Invalid signature for vote');
        return res.status(400).json({ message: 'Invalid vote signature' });
      }

      // Check for duplicate nullifier (prevents double voting)
      const [existingVotes] = await pool.query(
        'SELECT id FROM votes_meta WHERE nullifier_hash = ? AND election_id = ?',
        [nullifier, electionId]
      );

      if (existingVotes.length > 0) {
        // Log duplicate nullifier attempt
        await auditLogger.logDoubleVoteAttempt(
          userId,
          electionId,
          { reason: 'Duplicate nullifier detected', nullifier: nullifier.substring(0, 16) + '...' },
          req
        );
        return res.status(400).json({ message: 'This nullifier has already been used (possible double-vote attempt)' });
      }

      finalEncryptedBallot = encryptedBallot;
      finalNullifier = nullifier;
      finalSignature = signature;
      finalPublicKey = publicKey;
    } else {
      // LEGACY FLOW - Server-side encryption and signing
      console.log('Processing vote with legacy server-side cryptography');

      // Check if candidate exists in this election
      const [candidates] = await pool.query(
        'SELECT id FROM candidates WHERE id = ? AND election_id = ?',
        [candidateId, electionId]
      );

      if (candidates.length === 0) {
        return res.status(404).json({ message: 'Candidate not found in this election' });
      }

      // Generate nullifier
      finalNullifier = generateNullifier(userId.toString(), electionId.toString(), privateKey);

      // Create ballot
      const ballot = {
        candidateId,
        timestamp: Date.now()
      };

      // Encrypt ballot
      finalEncryptedBallot = encryptBallot(ballot, election.public_key);
      
      // Sign vote
      const voteData = {
        electionId,
        encryptedBallot: finalEncryptedBallot,
        nullifier: finalNullifier
      };
      finalSignature = signData(voteData, privateKey);
      
      // Get user's public key from database
      const [users] = await pool.query('SELECT public_key FROM users WHERE id = ?', [userId]);
      finalPublicKey = users[0]?.public_key || '';
    }

    // Submit vote to blockchain
    let blockchainResponse = null;
    try {
      const response = await blockchainApi.post('/vote', {
        voterId: userId,
        electionId,
        encryptedBallot: finalEncryptedBallot,
        nullifier: finalNullifier,
        signature: finalSignature
      });
      blockchainResponse = response;

      // Auto-mine the pending vote into a block immediately
      blockchainApi.get('/mine').catch(() => {});
    } catch (blockchainError) {
      console.warn('⚠️ Blockchain node not available, continuing with simulated transaction (development mode)');
      // In development, continue without blockchain
      // In production, this should fail
    }

    // Update registration status
    await pool.query(
      'UPDATE voter_registrations SET status = ? WHERE id = ?',
      ['voted', registration.id]
    );

    // Store vote metadata in database
    const receipt = blockchainResponse?.data?.receipt || {};
    const transactionHash = receipt.transactionHash || crypto.randomBytes(32).toString('hex');
    const blockIndex = receipt.blockIndex || 0;

    await pool.query(
      'INSERT INTO votes_meta (tx_hash, block_index, election_id, nullifier_hash, encrypted_ballot, signature, voter_public_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [transactionHash, blockIndex, electionId, finalNullifier, finalEncryptedBallot, finalSignature, finalPublicKey]
    );

    // Log successful vote
    await auditLogger.logVote(
      userId,
      electionId,
      true,
      {
        transactionHash: transactionHash.substring(0, 16) + '...',
        blockIndex,
        nullifier: finalNullifier.substring(0, 16) + '...',
        encryptionUsed: isNewCryptoFlow ? 'client-side' : 'server-side'
      },
      req
    );

    await pool.query(
      'INSERT INTO vote_receipts (election_id, nullifier_hash, transaction_hash) VALUES (?, ?, ?)',
      [electionId, finalNullifier, transactionHash]
    );

    res.json({
      message: 'Vote cast successfully',
      receipt: {
        transactionHash,
        blockIndex,
        timestamp: receipt.timestamp || new Date().toISOString(),
        nullifier: finalNullifier,
        signature: finalSignature
      }
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
        errorType: err.code || 'UNKNOWN'
      },
      req
    );
    
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
