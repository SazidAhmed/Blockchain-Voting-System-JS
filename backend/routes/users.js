const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { auth } = require('../middleware/auth');
const { registerLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { hashPassword, comparePassword, generateKeypair } = require('../utils/crypto');
require('dotenv').config();

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { institutionId, username, password, role, email, publicKey, encryptionPublicKey } = req.body;

    // Validate input
    if (!institutionId || !username || !password || !role || !email) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE institution_id = ? OR email = ?',
      [institutionId, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Use client-provided keys if available, otherwise generate server-side (legacy support)
    let userPublicKey = publicKey;
    let userEncryptionPublicKey = encryptionPublicKey;
    let privateKeyToReturn = null;

    if (!publicKey || !encryptionPublicKey) {
      // Legacy mode: generate keys server-side (not recommended for production)
      const keypair = generateKeypair();
      userPublicKey = keypair.publicKey;
      userEncryptionPublicKey = keypair.publicKey; // In legacy mode, use same key
      privateKeyToReturn = keypair.privateKey;
      console.warn('Warning: Keys generated server-side. Client-side key generation is preferred.');
    }

    // Insert user into database
    const [result] = await pool.query(
      'INSERT INTO users (institution_id, username, password, role, email, public_key, encryption_public_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [institutionId, username, hashedPassword, role, email, userPublicKey, userEncryptionPublicKey]
    );

    // Create JWT token
    const token = jwt.sign(
      { id: result.insertId, role, institutionId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = {
      token,
      user: {
        id: result.insertId,
        institutionId,
        username,
        role,
        email,
        publicKey: userPublicKey,
        encryptionPublicKey: userEncryptionPublicKey
      }
    };

    // Only return private key if it was generated server-side (legacy mode)
    if (privateKeyToReturn) {
      response.privateKey = privateKeyToReturn;
    }

    res.status(201).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { institutionId, password } = req.body;

    // Validate input
    if (!institutionId || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check if user exists
    const [users] = await pool.query(
      'SELECT * FROM users WHERE institution_id = ?',
      [institutionId]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Validate password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role, institutionId: user.institution_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        institutionId: user.institution_id,
        username: user.username,
        role: user.role,
        email: user.email,
        publicKey: user.public_key,
        encryptionPublicKey: user.encryption_public_key
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, institution_id, username, role, email, public_key, encryption_public_key, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      institutionId: user.institution_id,
      username: user.username,
      role: user.role,
      email: user.email,
      publicKey: user.public_key,
      encryptionPublicKey: user.encryption_public_key,
      createdAt: user.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;