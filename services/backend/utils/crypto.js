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
    
    // Decode the SPKI public key (SubjectPublicKeyInfo format)
    const publicKeyDer = Buffer.from(publicKeyBase64, 'base64');
    
    // SPKI format for P-256:
    // 0x30 (SEQUENCE) + length + algorithm OID + 0x03 (BIT STRING) + length + 0x00 + 0x04 (uncompressed point) + x + y
    // We need to extract the x and y coordinates from the DER structure
    
    // For P-256, the uncompressed public key is 65 bytes: 0x04 + 32-byte x + 32-byte y
    // In SPKI, this comes after the algorithm identifier
    
    // Find the BIT STRING tag (0x03) which contains the actual public key
    let keyStart = -1;
    for (let i = 0; i < publicKeyDer.length - 65; i++) {
      if (publicKeyDer[i] === 0x03 && publicKeyDer[i + 2] === 0x00 && publicKeyDer[i + 3] === 0x04) {
        keyStart = i + 3; // Points to 0x04
        break;
      }
    }
    
    if (keyStart === -1) {
      console.error('Failed to parse SPKI public key - could not find uncompressed point marker');
      return false;
    }
    
    // Verify the uncompressed point marker (0x04)
    if (publicKeyDer[keyStart] !== 0x04) {
      console.error('Invalid public key format - expected uncompressed point (0x04)');
      return false;
    }
    
    // Extract x and y coordinates (each 32 bytes for P-256)
    const xHex = publicKeyDer.slice(keyStart + 1, keyStart + 33).toString('hex');
    const yHex = publicKeyDer.slice(keyStart + 33, keyStart + 65).toString('hex');
    
    // Create public key from coordinates
    const publicKey = ec.keyFromPublic({
      x: xHex,
      y: yHex
    }, 'hex');
    
    // Prepare the data for verification (same as was signed)
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    console.log('🔍 Data being verified:', dataStr.substring(0, 200));
    
    // Hash the data with SHA-256 (matching Web Crypto API)
    const msgHash = crypto.createHash('sha256').update(dataStr, 'utf8').digest();
    console.log('🔍 Message hash:', msgHash.toString('hex').substring(0, 32) + '...');
    
    // Decode the signature
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    console.log('🔍 Signature length:', signatureBuffer.length, 'bytes');
    
    // Web Crypto API produces signatures in IEEE P1363 format (r || s)
    // Each component is 32 bytes for P-256
    if (signatureBuffer.length !== 64) {
      console.error('Invalid signature length - expected 64 bytes, got:', signatureBuffer.length);
      return false;
    }
    
    const r = signatureBuffer.slice(0, 32).toString('hex');
    const s = signatureBuffer.slice(32, 64).toString('hex');
    console.log('🔍 Signature r:', r.substring(0, 16) + '...');
    console.log('🔍 Signature s:', s.substring(0, 16) + '...');
    console.log('🔍 Public key x:', xHex.substring(0, 16) + '...');
    console.log('🔍 Public key y:', yHex.substring(0, 16) + '...');
    
    const signature = { r, s };
    
    // Verify the signature
    const isValid = publicKey.verify(msgHash, signature);
    
    if (isValid) {
      console.log('✅ ECDSA signature verified successfully');
    } else {
      console.warn('❌ ECDSA signature verification failed');
      console.warn('  Data:', dataStr.substring(0, 100));
      console.warn('  Signature valid format: YES');
      console.warn('  Public key valid format: YES');
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