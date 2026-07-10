/**
 * Key Management Service
 * 
 * Handles user key lifecycle:
 * - Key generation during registration
 * - Key storage and retrieval
 * - Key export for backup
 * - Key validation
 */

import cryptoService from './crypto.js'

class KeyManager {
  constructor() {
    this.currentKeys = null
  }

  /**
   * Initialize keys for a new user during registration
   * 
   * @param {string} userId - User identifier
   * @param {string} password - User password (for key encryption)
   * @returns {Promise<Object>} Generated keypairs with exported public keys
   */
  async initializeUserKeys(userId, password) {
    try {
      console.log('Generating cryptographic keypairs...')
      
      // Generate both signing and encryption keypairs
      const keypairs = await cryptoService.generateUserKeypairs()
      
      console.log('Keypairs generated successfully')
      
      // Export public keys for server registration
      const publicKeys = {
        signingPublicKey: await cryptoService.exportPublicKey(keypairs.signing.publicKey),
        encryptionPublicKey: await cryptoService.exportPublicKey(keypairs.encryption.publicKey)
      }
      
      // Store keys locally (encrypted with password)
      await cryptoService.storeKeypairs(keypairs, password, userId)
      
      console.log('Keys stored securely')
      
      // Keep keys in memory for this session
      this.currentKeys = keypairs
      
      return {
        keypairs,
        publicKeys
      }
    } catch (error) {
      console.error('Failed to initialize user keys:', error)
      throw new Error('Key initialization failed: ' + error.message)
    }
  }

  /**
   * Load existing keys for a user (during login)
   * 
   * @param {string} userId - User identifier
   * @param {string} password - User password (for key decryption)
   * @returns {Promise<Object>} Loaded keypairs
   */
  async loadUserKeys(userId, password) {
    try {
      console.log('Loading user keys...')
      
      const keypairs = await cryptoService.retrieveKeypairs(userId)
      
      // Keep keys in memory for this session
      this.currentKeys = keypairs
      
      console.log('Keys loaded successfully')
      
      return keypairs
    } catch (error) {
      console.error('Failed to load user keys:', error)
      throw new Error('Key loading failed: ' + error.message)
    }
  }

  /**
   * Get current session keys
   * 
   * @returns {Object|null} Current keypairs or null if not loaded
   */
  getCurrentKeys() {
    return this.currentKeys
  }

  /**
   * Clear keys from memory (during logout)
   */
  clearKeys() {
    this.currentKeys = null
    console.log('Keys cleared from memory')
  }

  /**
   * Export private key for backup (DANGEROUS - handle with care)
   * 
   * @param {string} password - User password for verification
   * @returns {Promise<Object>} Exported private keys
   */
  async exportPrivateKeysForBackup(password) {
    try {
      if (!this.currentKeys) {
        throw new Error('No keys loaded')
      }
      
      const exported = {
        signing: {
          publicKey: await cryptoService.exportPublicKey(this.currentKeys.signing.publicKey),
          privateKey: await cryptoService.exportPrivateKey(this.currentKeys.signing.privateKey)
        },
        encryption: {
          publicKey: await cryptoService.exportPublicKey(this.currentKeys.encryption.publicKey),
          privateKey: await cryptoService.exportPrivateKey(this.currentKeys.encryption.privateKey)
        },
        warning: 'KEEP THIS BACKUP SECURE! Anyone with these keys can impersonate you.',
        exportedAt: new Date().toISOString()
      }
      
      return exported
    } catch (error) {
      console.error('Failed to export keys:', error)
      throw new Error('Key export failed: ' + error.message)
    }
  }

  /**
   * Import keys from backup
   * 
   * @param {Object} exportedKeys - Previously exported keys
   * @param {string} userId - User identifier
   * @param {string} password - User password
   * @returns {Promise<boolean>} Success status
   */
  async importKeysFromBackup(exportedKeys, userId, password) {
    try {
      console.log('Importing keys from backup...')
      
      // Re-import keys
      const keypairs = {
        signing: {
          publicKey: await cryptoService.importPublicKey(
            exportedKeys.signing.publicKey, 
            'ECDSA', 
            ['verify']
          ),
          privateKey: await cryptoService.importPrivateKey(
            exportedKeys.signing.privateKey, 
            'ECDSA', 
            ['sign']
          )
        },
        encryption: {
          publicKey: await cryptoService.importPublicKey(
            exportedKeys.encryption.publicKey, 
            'RSA-OAEP', 
            ['encrypt']
          ),
          privateKey: await cryptoService.importPrivateKey(
            exportedKeys.encryption.privateKey, 
            'RSA-OAEP', 
            ['decrypt']
          )
        }
      }
      
      // Store keys
      await cryptoService.storeKeypairs(keypairs, password, userId)
      
      // Load into memory
      this.currentKeys = keypairs
      
      console.log('Keys imported successfully')
      
      return true
    } catch (error) {
      console.error('Failed to import keys:', error)
      throw new Error('Key import failed: ' + error.message)
    }
  }

  /**
   * Check if keys exist for a user
   * 
   * @param {string} userId - User identifier
   * @returns {boolean} True if keys exist
   */
  hasStoredKeys(userId) {
    return localStorage.getItem(`voting_keys_${userId}`) !== null
  }

  /**
   * Validate that keys are properly formatted and functional
   * 
   * @returns {Promise<boolean>} True if keys are valid
   */
  async validateKeys() {
    try {
      if (!this.currentKeys) {
        return false
      }
      
      // Test signing
      const testData = 'test_data_' + Date.now()
      const signature = await cryptoService.signData(
        testData, 
        this.currentKeys.signing.privateKey
      )
      
      const isValid = await cryptoService.verifySignature(
        signature,
        testData,
        this.currentKeys.signing.publicKey
      )
      
      return isValid
    } catch (error) {
      console.error('Key validation failed:', error)
      return false
    }
  }

  /**
   * Generate a vote with current keys
   * 
   * @param {Object} voteData - Vote data
   * @param {string} electionId - Election ID
   * @param {string} electionPublicKey - Election's encryption public key
   * @returns {Promise<Object>} Vote package ready for submission
   */
  async generateVote(voteData, electionId, electionPublicKey) {
    try {
      if (!this.currentKeys) {
        throw new Error('No keys loaded. Please login first.')
      }
      
      console.log('Creating encrypted vote package...')
      
      const votePackage = await cryptoService.createVotePackage(
        voteData,
        electionId,
        this.currentKeys,
        electionPublicKey
      )
      
      console.log('Vote package created successfully')
      
      return votePackage
    } catch (error) {
      console.error('Failed to generate vote:', error)
      throw new Error('Vote generation failed: ' + error.message)
    }
  }

  /**
   * Get public keys for registration
   * 
   * @returns {Promise<Object>} Public keys
   */
  async getPublicKeys() {
    try {
      if (!this.currentKeys) {
        throw new Error('No keys loaded')
      }
      
      return {
        signingPublicKey: await cryptoService.exportPublicKey(
          this.currentKeys.signing.publicKey
        ),
        encryptionPublicKey: await cryptoService.exportPublicKey(
          this.currentKeys.encryption.publicKey
        )
      }
    } catch (error) {
      console.error('Failed to get public keys:', error)
      throw new Error('Public key retrieval failed: ' + error.message)
    }
  }

  /**
   * Generate a nullifier for an election (for checking if already voted)
   * 
   * @param {string} electionId - Election identifier
   * @returns {Promise<string>} Nullifier hash
   */
  async generateNullifierForElection(electionId) {
    try {
      if (!this.currentKeys) {
        throw new Error('No keys loaded')
      }
      
      return await cryptoService.generateNullifier(
        this.currentKeys.signing.privateKey,
        electionId
      )
    } catch (error) {
      console.error('Failed to generate nullifier:', error)
      throw new Error('Nullifier generation failed: ' + error.message)
    }
  }
}

// Export singleton instance
export default new KeyManager()
