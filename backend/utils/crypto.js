const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const EC = require('elliptic').ec;

// Generate a random token for voter registration
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Hash a password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

// Compare password with hash
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generate a keypair for a user (legacy - server-side generation)
function generateKeypair() {
  // In a real implementation, this would use proper asymmetric cryptography
  // For development, we'll simulate it with random values
  return {
    publicKey: crypto.randomBytes(32).toString('hex'),
    privateKey: crypto.randomBytes(32).toString('hex')
  };
}

// Generate a nullifier for a vote
function generateNullifier(userId, electionId, privateKey) {
  // In a real implementation, this would be a deterministic function of the inputs
  // that doesn't reveal the user's identity
  const data = userId + electionId + privateKey;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Encrypt a ballot (legacy)
function encryptBallot(ballot, electionPublicKey) {
  // In a real implementation, this would use threshold encryption
  // For development, we'll simulate it with a simple hash
  const ballotStr = JSON.stringify(ballot);
  // Simulate encryption with a hash
  return crypto.createHash('sha256').update(ballotStr + electionPublicKey).digest('hex');
}

// Sign data with a private key (legacy)
function signData(data, privateKey) {
  // In a real implementation, this would use proper digital signatures
  // For development, we'll simulate it
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
  return crypto.createHmac('sha256', privateKey).update(dataStr).digest('hex');
}

// Verify a signature (legacy)
function verifySignature(data, signature, publicKey) {
  // In a real implementation, this would verify the signature cryptographically
  // For development, we'll simulate it
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const expectedSignature = crypto.createHmac('sha256', publicKey).update(dataStr).digest('hex');
  return signature === expectedSignature;
}

/**
 * Verify ECDSA signature from Web Crypto API (P-256 curve)
 * Uses elliptic library for full cryptographic verification
 * @param {string} publicKeyBase64 - Base64-encoded public key in JWK format
 * @param {string} signatureBase64 - Base64-encoded signature
 * @param {Object} data - Data that was signed
 * @returns {boolean} - True if signature is valid
 */
function verifyECDSASignature(publicKeyBase64, signatureBase64, data) {
  try {
    // Initialize elliptic curve with P-256 (same as secp256r1)
    const ec = new EC('p256');
    
    // Parse the JWK public key
    let publicKeyJWK;
    try {
      const publicKeyStr = Buffer.from(publicKeyBase64, 'base64').toString('utf8');
      publicKeyJWK = JSON.parse(publicKeyStr);
    } catch (parseError) {
      console.error('Failed to parse public key JWK:', parseError.message);
      return false;
    }
    
    // Validate JWK format
    if (!publicKeyJWK.x || !publicKeyJWK.y || !publicKeyJWK.kty || publicKeyJWK.kty !== 'EC') {
      console.error('Invalid JWK format - missing required fields or wrong key type');
      return false;
    }
    
    if (!publicKeyJWK.crv || publicKeyJWK.crv !== 'P-256') {
      console.error('Invalid curve - expected P-256, got:', publicKeyJWK.crv);
      return false;
    }
    
    // Convert JWK coordinates to hex
    // Web Crypto uses base64url, but for compatibility we accept base64
    const xHex = Buffer.from(publicKeyJWK.x, 'base64').toString('hex');
    const yHex = Buffer.from(publicKeyJWK.y, 'base64').toString('hex');
    
    // Create public key from coordinates
    const publicKey = ec.keyFromPublic({
      x: xHex,
      y: yHex
    }, 'hex');
    
    // Prepare the data for verification (same as was signed)
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // Hash the data with SHA-256 (matching Web Crypto API)
    const msgHash = crypto.createHash('sha256').update(dataStr, 'utf8').digest();
    
    // Decode the signature
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    
    // Web Crypto API produces signatures in IEEE P1363 format (r || s)
    // Each component is 32 bytes for P-256
    if (signatureBuffer.length !== 64) {
      console.error('Invalid signature length - expected 64 bytes, got:', signatureBuffer.length);
      return false;
    }
    
    const r = signatureBuffer.slice(0, 32).toString('hex');
    const s = signatureBuffer.slice(32, 64).toString('hex');
    
    const signature = { r, s };
    
    // Verify the signature
    const isValid = publicKey.verify(msgHash, signature);
    
    if (isValid) {
      console.log('✅ ECDSA signature verified successfully');
    } else {
      console.warn('❌ ECDSA signature verification failed');
    }
    
    return isValid;
    
  } catch (error) {
    console.error('Error verifying ECDSA signature:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

/**
 * Alternative ECDSA verification using DER format
 * This is compatible with Web Crypto API ECDSA signatures
 */
function verifyECDSASignatureSimple(publicKeyBase64, signatureBase64, data) {
  try {
    // For now, we'll use a simplified verification
    // In production, you'd want to use a proper crypto library like node-jose or elliptic
    
    // The public key might be in SPKI format (base64) or JWK format (base64-encoded JSON)
    // For development mode, we'll just validate the signature format
    
    // Create data hash
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const dataHash = crypto.createHash('sha256').update(dataStr).digest();
    
    // Validate signature format
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    
    // Basic validation: P-256 signatures are typically 64-72 bytes
    if (signatureBuffer.length < 64 || signatureBuffer.length > 72) {
      console.warn('Invalid signature length:', signatureBuffer.length);
      return false;
    }
    
    // Validate public key is valid base64
    const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64');
    if (publicKeyBuffer.length < 50) {
      console.warn('Invalid public key length:', publicKeyBuffer.length);
      return false;
    }
    
    // For development, accept signatures with valid format
    // TODO: Implement full ECDSA verification in production
    console.log('⚠️  Using simplified signature verification (development mode)');
    return true;
  } catch (error) {
    console.error('Error verifying ECDSA signature:', error);
    return false;
  }
}

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  generateKeypair,
  generateNullifier,
  encryptBallot,
  signData,
  verifySignature,
  verifyECDSASignature,
  verifyECDSASignatureSimple
};