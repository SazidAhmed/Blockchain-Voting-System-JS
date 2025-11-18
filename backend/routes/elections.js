const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../config/db');
const { auth, adminAuth } = require('../middleware/auth');
const { voteLimiter } = require('../middleware/rateLimiter');
const { validateVote, validateElectionId, validateCreateElection } = require('../middleware/validation');
const { generateToken, generateNullifier, encryptBallot, signData, verifyECDSASignature } = require('../utils/crypto');
const auditLogger = require('../utils/auditLogger');
const axios = require('axios');
require('dotenv').config();

// Blockchain node API
const blockchainApi = axios.create({
  baseURL: process.env.BLOCKCHAIN_NODE_URL
});

// @route   POST /api/elections
// @desc    Create a new election
// @access  Admin only
router.post('/', adminAuth, async (req, res) => {
  try {
    const { title, description, startDate, endDate, candidates } = req.body;

    // Validate input
    if (!title || !startDate || !endDate || !candidates || candidates.length === 0) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Generate a public key for the election (in production, this would be a threshold key)
    const electionPublicKey = require('crypto').randomBytes(32).toString('hex');

    // Insert election into database
    const [result] = await pool.query(
      'INSERT INTO elections (title, description, start_date, end_date, status, created_by, public_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, startDate, endDate, 'pending', req.user.id, electionPublicKey]
    );

    const electionId = result.insertId;

    // Insert candidates
    for (const candidate of candidates) {
      await pool.query(
        'INSERT INTO candidates (election_id, name, description) VALUES (?, ?, ?)',
        [electionId, candidate.name, candidate.description]
      );
    }

    res.status(201).json({
      message: 'Election created successfully',
      electionId,
      title,
      startDate,
      endDate,
      publicKey: electionPublicKey
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/elections
// @desc    Get all elections
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [elections] = await pool.query(
      'SELECT id, title, description, start_date, end_date, status, created_at FROM elections ORDER BY created_at DESC'
    );

    res.json(elections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/elections/:id
// @desc    Get election by ID with candidates
// @access  Public
router.get('/:id', validateElectionId, async (req, res) => {
  try {
    const [elections] = await pool.query(
      'SELECT id, title, description, start_date, end_date, status, public_key, created_at FROM elections WHERE id = ?',
      [req.params.id]
    );

    if (elections.length === 0) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const election = elections[0];

    // Get candidates
    const [candidates] = await pool.query(
      'SELECT id, name, description FROM candidates WHERE election_id = ?',
      [req.params.id]
    );

    // Get blockchain results if election is active or completed
    let results = null;
    if (election.status === 'active' || election.status === 'completed') {
      try {
        const response = await blockchainApi.get(`/elections/${req.params.id}/results`);
        results = response.data;
      } catch (err) {
        console.error('Error fetching results from blockchain:', err);
        // Continue without results
      }
    }

    res.json({
      ...election,
      candidates,
      results
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/elections/:id/status
// @desc    Update election status
// @access  Admin only
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'active', 'completed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [result] = await pool.query(
      'UPDATE elections SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Election not found' });
    }

    res.json({ message: 'Election status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
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
      nullifier,           // New: client-generated nullifier
      signature,           // New: ECDSA signature
      publicKey,           // New: public key for verification
      timestamp            // New: timestamp from client
    } = req.body;

    console.log('📥 Received vote request:', {
      hasEncryptedBallot: !!encryptedBallot,
      hasNullifier: !!nullifier,
      hasSignature: !!signature,
      hasPublicKey: !!publicKey,
      hasTimestamp: !!timestamp,
      hasCandidateId: !!candidateId,
      bodyKeys: Object.keys(req.body)
    });

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
      'SELECT id, status, public_key FROM elections WHERE id = ?',
      [electionId]
    );

    if (elections.length === 0) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const election = elections[0];

    if (election.status !== 'active') {
      return res.status(400).json({ message: 'Voting is not currently open for this election' });
    }

    // Check if user is registered
    const [registrations] = await pool.query(
      'SELECT id, status, registration_token FROM voter_registrations WHERE user_id = ? AND election_id = ?',
      [userId, electionId]
    );

    if (registrations.length === 0) {
      return res.status(400).json({ message: 'You are not registered for this election' });
    }

    const registration = registrations[0];

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

      console.log('✅ Signature verified, nullifier checked');
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

    // Store receipt (commented out - table structure mismatch)
    // await pool.query(
    //   'INSERT INTO vote_receipts (election_id, nullifier_hash, transaction_hash) VALUES (?, ?, ?)',
    //   [electionId, finalNullifier, transactionHash]
    // );

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

// @route   GET /api/elections/admin
// @desc    Get all elections with stats (admin only)
// @access  Admin only
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const [elections] = await pool.query(
      'SELECT e.*, COUNT(DISTINCT c.id) as candidates_count, COUNT(DISTINCT vm.id) as votes_count FROM elections e LEFT JOIN candidates c ON e.id = c.election_id LEFT JOIN votes_meta vm ON e.id = vm.election_id GROUP BY e.id ORDER BY e.created_at DESC'
    );

    // Get candidates for each election
    for (const election of elections) {
      const [candidates] = await pool.query(
        'SELECT c.*, COUNT(DISTINCT vm.id) as votes_count FROM candidates c LEFT JOIN votes_meta vm ON c.id = vm.election_id GROUP BY c.id WHERE c.election_id = ?',
        [election.id]
      );
      election.candidates = candidates;
    }

    res.json(elections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/elections/:id/status
// @desc    Update election status
// @access  Admin only
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const electionId = req.params.id;

    if (!['pending', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await pool.query(
      'UPDATE elections SET status = ? WHERE id = ?',
      [status, electionId]
    );

    res.json({ message: 'Election status updated successfully', status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/elections/:id
// @desc    Delete an election
// @access  Admin only
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const electionId = req.params.id;

    // Delete related data first
    await pool.query('DELETE FROM votes_meta WHERE election_id = ?', [electionId]);
    await pool.query('DELETE FROM voter_registrations WHERE election_id = ?', [electionId]);
    await pool.query('DELETE FROM candidates WHERE election_id = ?', [electionId]);
    await pool.query('DELETE FROM elections WHERE id = ?', [electionId]);

    res.json({ message: 'Election deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/elections/:id/candidates
// @desc    Add a candidate to election
// @access  Admin only
router.post('/:id/candidates', adminAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const electionId = req.params.id;

    if (!name) {
      return res.status(400).json({ message: 'Candidate name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO candidates (election_id, name, description) VALUES (?, ?, ?)',
      [electionId, name, description]
    );

    res.status(201).json({
      message: 'Candidate added successfully',
      candidateId: result.insertId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/candidates/:id
// @desc    Delete a candidate
// @access  Admin only
router.delete('/candidates/:id', adminAuth, async (req, res) => {
  try {
    const candidateId = req.params.id;

    await pool.query('DELETE FROM candidates WHERE id = ?', [candidateId]);

    res.json({ message: 'Candidate deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;