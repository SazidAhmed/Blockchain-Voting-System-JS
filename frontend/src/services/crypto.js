/**
 * Client-Side Cryptography Service
 * 
 * Implements secure cryptographic operations using the Web Crypto API
 * for the blockchain voting system. This module handles:
 * - Ed25519 keypair generation (voting keys)
 * - RSA keypair generation (encryption keys)
 * - Ballot encryption
 * - Digital signatures
 * - Nullifier generation (privacy-preserving voter anonymity)
 * - Key export/import for storage
 */

class CryptoService {
  constructor() {
    this.crypto = window.crypto.subtle
    this.encoder = new TextEncoder()
    this.decoder = new TextDecoder()
  }

  /**
   * Generate an Ed25519 keypair for digital signatures
   * This is used for signing votes to ensure authenticity
   * 
   * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
   */
  async generateSigningKeypair() {
    try {
      const keypair = await this.crypto.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256' // WebCrypto doesn't support Ed25519 yet, using P-256 as alternative
        },
        true, // extractable
        ['sign', 'verify']
      )
      
      return keypair
    } catch (error) {
      console.error('Failed to generate signing keypair:', error)
      throw new Error('Keypair generation failed')
    }
  }

  /**
   * Generate an RSA keypair for encryption
   * This is used for encrypting sensitive ballot data
   * 
   * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
   */
  async generateEncryptionKeypair() {
    try {
      const keypair = await this.crypto.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true, // extractable
        ['encrypt', 'decrypt']
      )
      
      return keypair
    } catch (error) {
      console.error('Failed to generate encryption keypair:', error)
      throw new Error('Encryption keypair generation failed')
    }
  }

  /**
   * Generate both signing and encryption keypairs for a user
   * 
   * @returns {Promise<{signing: Object, encryption: Object}>}
   */
  async generateUserKeypairs() {
    const [signing, encryption] = await Promise.all([
      this.generateSigningKeypair(),
      this.generateEncryptionKeypair()
    ])
    
    return { signing, encryption }
  }

  /**
   * Export a public key to base64 format for transmission
   * 
   * @param {CryptoKey} key - The public key to export
   * @returns {Promise<string>} Base64-encoded public key
   */
  async exportPublicKey(key) {
    try {
      const exported = await this.crypto.exportKey('spki', key)
      const exportedAsBase64 = this.arrayBufferToBase64(exported)
      return exportedAsBase64
    } catch (error) {
      console.error('Failed to export public key:', error)
      throw new Error('Public key export failed')
    }
  }

  /**
   * Export a private key to base64 format (encrypted storage)
   * WARNING: Handle private keys with extreme care
   * 
   * @param {CryptoKey} key - The private key to export
   * @returns {Promise<string>} Base64-encoded private key
   */
  async exportPrivateKey(key) {
    try {
      const exported = await this.crypto.exportKey('pkcs8', key)
      const exportedAsBase64 = this.arrayBufferToBase64(exported)
      return exportedAsBase64
    } catch (error) {
      console.error('Failed to export private key:', error)
      throw new Error('Private key export failed')
    }
  }

  /**
   * Import a public key from base64 format
   * 
   * @param {string} keyData - Base64-encoded public key
   * @param {string} algorithm - 'ECDSA' or 'RSA-OAEP'
   * @param {Array<string>} keyUsages - Key usage array
   * @returns {Promise<CryptoKey>}
   */
  async importPublicKey(keyData, algorithm = 'ECDSA', keyUsages = ['verify']) {
    try {
      const binaryKey = this.base64ToArrayBuffer(keyData)
      
      const algorithmParams = algorithm === 'ECDSA' 
        ? { name: 'ECDSA', namedCurve: 'P-256' }
        : { name: 'RSA-OAEP', hash: 'SHA-256' }
      
      const key = await this.crypto.importKey(
        'spki',
        binaryKey,
        algorithmParams,
        true,
        keyUsages
      )
      
      return key
    } catch (error) {
      console.error('Failed to import public key:', error)
      throw new Error('Public key import failed')
    }
  }

  /**
   * Import a private key from base64 format
   * 
   * @param {string} keyData - Base64-encoded private key
   * @param {string} algorithm - 'ECDSA' or 'RSA-OAEP'
   * @param {Array<string>} keyUsages - Key usage array
   * @returns {Promise<CryptoKey>}
   */
  async importPrivateKey(keyData, algorithm = 'ECDSA', keyUsages = ['sign']) {
    try {
      const binaryKey = this.base64ToArrayBuffer(keyData)
      
      const algorithmParams = algorithm === 'ECDSA'
        ? { name: 'ECDSA', namedCurve: 'P-256' }
        : { name: 'RSA-OAEP', hash: 'SHA-256' }
      
      const key = await this.crypto.importKey(
        'pkcs8',
        binaryKey,
        algorithmParams,
        true,
        keyUsages
      )
      
      return key
    } catch (error) {
      console.error('Failed to import private key:', error)
      throw new Error('Private key import failed')
    }
  }

  /**
   * Encrypt ballot data using the election's public key
   * 
   * @param {Object} ballotData - The ballot data to encrypt
   * @param {CryptoKey|string} electionPublicKey - Election's RSA public key
   * @returns {Promise<string>} Base64-encoded encrypted ballot
   */
  async encryptBallot(ballotData, electionPublicKey) {
    try {
      // If the key is a string, import it first
      if (typeof electionPublicKey === 'string') {
        electionPublicKey = await this.importPublicKey(
          electionPublicKey, 
          'RSA-OAEP', 
          ['encrypt']
        )
      }
      
      // Convert ballot data to JSON string
      const ballotJson = JSON.stringify(ballotData)
      const ballotBytes = this.encoder.encode(ballotJson)
      
      // Encrypt using RSA-OAEP
      const encrypted = await this.crypto.encrypt(
        {
          name: 'RSA-OAEP'
        },
        electionPublicKey,
        ballotBytes
      )
      
      return this.arrayBufferToBase64(encrypted)
    } catch (error) {
      console.error('Failed to encrypt ballot:', error)
      throw new Error('Ballot encryption failed')
    }
  }

  /**
   * Sign data using a private key
   * 
   * @param {string|Object} data - Data to sign
   * @param {CryptoKey|string} privateKey - Private signing key
   * @returns {Promise<string>} Base64-encoded signature
   */
  async signData(data, privateKey) {
    try {
      // If the key is a string, import it first
      if (typeof privateKey === 'string') {
        privateKey = await this.importPrivateKey(privateKey, 'ECDSA', ['sign'])
      }
      
      // Convert data to bytes
      const dataString = typeof data === 'string' ? data : JSON.stringify(data)
      const dataBytes = this.encoder.encode(dataString)
      
      // Sign using ECDSA
      const signature = await this.crypto.sign(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }
        },
        privateKey,
        dataBytes
      )
      
      return this.arrayBufferToBase64(signature)
    } catch (error) {
      console.error('Failed to sign data:', error)
      throw new Error('Data signing failed')
    }
  }

  /**
   * Verify a signature
   * 
   * @param {string} signature - Base64-encoded signature
   * @param {string|Object} data - Original data
   * @param {CryptoKey|string} publicKey - Public verification key
   * @returns {Promise<boolean>} True if signature is valid
   */
  async verifySignature(signature, data, publicKey) {
    try {
      // If the key is a string, import it first
      if (typeof publicKey === 'string') {
        publicKey = await this.importPublicKey(publicKey, 'ECDSA', ['verify'])
      }
      
      // Convert data to bytes
      const dataString = typeof data === 'string' ? data : JSON.stringify(data)
      const dataBytes = this.encoder.encode(dataString)
      
      // Convert signature to ArrayBuffer
      const signatureBuffer = this.base64ToArrayBuffer(signature)
      
      // Verify using ECDSA
      const isValid = await this.crypto.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }
        },
        publicKey,
        signatureBuffer,
        dataBytes
      )
      
      return isValid
    } catch (error) {
      console.error('Failed to verify signature:', error)
      return false
    }
  }

  /**
   * Generate a privacy-preserving nullifier
   * 
   * A nullifier is a unique identifier for a vote that prevents double-voting
   * while preserving voter anonymity. It's derived from:
   * - The voter's private key
   * - The election ID
   * 
   * @param {CryptoKey|string} privateKey - Voter's private signing key
   * @param {string} electionId - The election identifier
   * @returns {Promise<string>} Hex-encoded nullifier hash
   */
  async generateNullifier(privateKey, electionId) {
    try {
      // Export private key to get deterministic seed
      let privateKeyData
      if (typeof privateKey === 'string') {
        privateKeyData = privateKey
      } else {
        privateKeyData = await this.exportPrivateKey(privateKey)
      }
      
      // Combine private key and election ID
      const combined = privateKeyData + '||' + electionId
      const combinedBytes = this.encoder.encode(combined)
      
      // Hash to create nullifier
      const hashBuffer = await this.crypto.digest('SHA-256', combinedBytes)
      
      // Convert to hex
      return this.arrayBufferToHex(hashBuffer)
    } catch (error) {
      console.error('Failed to generate nullifier:', error)
      throw new Error('Nullifier generation failed')
    }
  }

  /**
   * Generate a random pseudonym for voter anonymity
   * 
   * @returns {Promise<string>} Base64-encoded random pseudonym
   */
  async generatePseudonym() {
    const randomBytes = new Uint8Array(32)
    window.crypto.getRandomValues(randomBytes)
    return this.arrayBufferToBase64(randomBytes.buffer)
  }

  /**
   * Hash data using SHA-256
   * 
   * @param {string|Object} data - Data to hash
   * @returns {Promise<string>} Hex-encoded hash
   */
  async hash(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data)
    const dataBytes = this.encoder.encode(dataString)
    const hashBuffer = await this.crypto.digest('SHA-256', dataBytes)
    return this.arrayBufferToHex(hashBuffer)
  }

  /**
   * Store keypair in localStorage (encrypted with password)
   * WARNING: This is for demo purposes. Production should use secure storage.
   * 
   * @param {Object} keypairs - User keypairs
   * @param {string} password - User password for encryption
   * @param {string} userId - User identifier
   */
  async storeKeypairs(keypairs, password, userId) {
    try {
      // Export keys
      const exported = {
        signing: {
          publicKey: await this.exportPublicKey(keypairs.signing.publicKey),
          privateKey: await this.exportPrivateKey(keypairs.signing.privateKey)
        },
        encryption: {
          publicKey: await this.exportPublicKey(keypairs.encryption.publicKey),
          privateKey: await this.exportPrivateKey(keypairs.encryption.privateKey)
        }
      }
      
      // In production, encrypt with password-derived key
      // For now, storing as JSON (DEMO ONLY)
      const keyData = JSON.stringify(exported)
      localStorage.setItem(`voting_keys_${userId}`, keyData)
      
      console.warn('Keys stored in localStorage (DEMO ONLY - not secure for production)')
      
      return true
    } catch (error) {
      console.error('Failed to store keypairs:', error)
      throw new Error('Keypair storage failed')
    }
  }

  /**
   * Retrieve keypair from localStorage
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Keypairs object
   */
  async retrieveKeypairs(userId) {
    try {
      const keyData = localStorage.getItem(`voting_keys_${userId}`)
      if (!keyData) {
        throw new Error('No keys found for user')
      }
      
      const exported = JSON.parse(keyData)
      
      // Re-import keys
      const keypairs = {
        signing: {
          publicKey: await this.importPublicKey(exported.signing.publicKey, 'ECDSA', ['verify']),
          privateKey: await this.importPrivateKey(exported.signing.privateKey, 'ECDSA', ['sign'])
        },
        encryption: {
          publicKey: await this.importPublicKey(exported.encryption.publicKey, 'RSA-OAEP', ['encrypt']),
          privateKey: await this.importPrivateKey(exported.encryption.privateKey, 'RSA-OAEP', ['decrypt'])
        }
      }
      
      return keypairs
    } catch (error) {
      console.error('Failed to retrieve keypairs:', error)
      throw new Error('Keypair retrieval failed')
    }
  }

  /**
   * Create a vote package with encryption and signature
   * 
   * @param {Object} voteData - The vote data (candidateId, etc.)
   * @param {string} electionId - Election identifier
   * @param {Object} voterKeys - Voter's keypairs
   * @param {CryptoKey|string} electionPublicKey - Election's public encryption key
   * @returns {Promise<Object>} Complete vote package
   */
  async createVotePackage(voteData, electionId, voterKeys, electionPublicKey) {
    try {
      // 1. Generate nullifier
      const nullifier = await this.generateNullifier(
        voterKeys.signing.privateKey, 
        electionId
      )
      
      // 2. Create ballot data
      const ballot = {
        candidateId: voteData.candidateId,
        timestamp: Date.now(),
        electionId: electionId
      }
      
      // 3. Encrypt ballot (or send as JSON if no valid election key)
      let encryptedBallot
      if (electionPublicKey && this.isValidPublicKey(electionPublicKey)) {
        console.log('Encrypting ballot with election public key...')
        encryptedBallot = await this.encryptBallot(ballot, electionPublicKey)
      } else {
        console.warn('⚠️ No valid election public key - sending ballot as JSON (development mode)')
        // For testing: send ballot as Base64-encoded JSON
        encryptedBallot = btoa(JSON.stringify(ballot))
      }
      
      // 4. Create vote package
      const votePackage = {
        encryptedBallot,
        nullifier,
        electionId,
        timestamp: ballot.timestamp
      }
      
      // 5. Sign the vote package
      const signature = await this.signData(votePackage, voterKeys.signing.privateKey)
      
      // 6. Get public key for verification
      const publicKey = await this.exportPublicKey(voterKeys.signing.publicKey)
      
      return {
        ...votePackage,
        signature,
        publicKey
      }
    } catch (error) {
      console.error('Failed to create vote package:', error)
      throw new Error('Vote package creation failed')
    }
  }

  // Check if a string looks like a valid Base64-encoded public key
  isValidPublicKey(key) {
    if (!key || typeof key !== 'string') return false
    // Valid RSA/EC public keys in JWK format should start with 'eyJ' (Base64 of '{"')
    // or be at least 200 characters for PEM format
    return key.startsWith('eyJ') || key.length > 200
  }

  // ===== Utility Functions =====

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  arrayBufferToHex(buffer) {
    const bytes = new Uint8Array(buffer)
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
    }
    return bytes.buffer
  }
}

// Export singleton instance
export default new CryptoService()
