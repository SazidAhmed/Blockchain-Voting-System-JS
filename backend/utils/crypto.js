const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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
 * @param {string} publicKeyBase64 - Base64-encoded public key in JWK format
 * @param {string} signatureBase64 - Base64-encoded signature
 * @param {Object} data - Data that was signed
 * @returns {boolean} - True if signature is valid
 */
function verifyECDSASignature(publicKeyBase64, signatureBase64, data) {
  try {
    // Parse the JWK public key
    const publicKeyJWK = JSON.parse(Buffer.from(publicKeyBase64, 'base64').toString('utf8'));
    
    // Convert JWK to raw format (x and y coordinates)
    // P-256 uses 32-byte coordinates
    const xBuffer = Buffer.from(publicKeyJWK.x, 'base64');
    const yBuffer = Buffer.from(publicKeyJWK.y, 'base64');
    
    // Construct the uncompressed public key format for Node.js crypto
    // Format: 0x04 || x || y (65 bytes total for P-256)
    const publicKeyBuffer = Buffer.concat([
      Buffer.from([0x04]), // Uncompressed point indicator
      xBuffer,
      yBuffer
    ]);
    
    // Create a public key object
    const publicKey = crypto.createPublicKey({
      key: publicKeyBuffer,
      format: 'der',
      type: 'spki'
    });
    
    // Prepare the data for verification
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const dataBuffer = Buffer.from(dataStr, 'utf8');
    
    // Decode the signature
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    
    // Verify the signature
    const verify = crypto.createVerify('SHA256');
    verify.update(dataBuffer);
    verify.end();
    
    return verify.verify(publicKey, signatureBuffer);
  } catch (error) {
    console.error('Error verifying ECDSA signature:', error);
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