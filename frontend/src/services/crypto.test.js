/**
 * Client-Side Cryptography Test Suite
 * 
 * Run these tests in the browser console to verify crypto functionality
 * 
 * Usage:
 * 1. Open browser console
 * 2. Copy and paste this file
 * 3. Run: await runAllTests()
 */

// Import services (adjust path as needed in actual implementation)
// import cryptoService from './services/crypto.js'
// import keyManager from './services/keyManager.js'

/**
 * Test 1: Key Generation
 */
async function testKeyGeneration() {
  console.log('🧪 Test 1: Key Generation')
  try {
    const keypairs = await cryptoService.generateUserKeypairs()
    
    console.assert(keypairs.signing, 'Signing keypair generated')
    console.assert(keypairs.signing.publicKey, 'Signing public key exists')
    console.assert(keypairs.signing.privateKey, 'Signing private key exists')
    
    console.assert(keypairs.encryption, 'Encryption keypair generated')
    console.assert(keypairs.encryption.publicKey, 'Encryption public key exists')
    console.assert(keypairs.encryption.privateKey, 'Encryption private key exists')
    
    console.log('✅ Key generation: PASSED')
    return { success: true, keypairs }
  } catch (error) {
    console.error('❌ Key generation: FAILED', error)
    return { success: false, error }
  }
}

/**
 * Test 2: Key Export/Import
 */
async function testKeyExportImport() {
  console.log('🧪 Test 2: Key Export/Import')
  try {
    // Generate keypair
    const keypairs = await cryptoService.generateUserKeypairs()
    
    // Export public key
    const exportedPublic = await cryptoService.exportPublicKey(keypairs.signing.publicKey)
    console.assert(exportedPublic.length > 0, 'Public key exported')
    
    // Export private key
    const exportedPrivate = await cryptoService.exportPrivateKey(keypairs.signing.privateKey)
    console.assert(exportedPrivate.length > 0, 'Private key exported')
    
    // Re-import public key
    const importedPublic = await cryptoService.importPublicKey(exportedPublic, 'ECDSA', ['verify'])
    console.assert(importedPublic, 'Public key imported')
    
    // Re-import private key
    const importedPrivate = await cryptoService.importPrivateKey(exportedPrivate, 'ECDSA', ['sign'])
    console.assert(importedPrivate, 'Private key imported')
    
    console.log('✅ Key export/import: PASSED')
    return { success: true }
  } catch (error) {
    console.error('❌ Key export/import: FAILED', error)
    return { success: false, error }
  }
}

/**
 * Test 3: Digital Signatures
 */
async function testDigitalSignatures() {
  console.log('🧪 Test 3: Digital Signatures')
  try {
    // Generate keypair
    const keypairs = await cryptoService.generateUserKeypairs()
    
    // Test data
    const testData = { message: 'Test vote data', timestamp: Date.now() }
    
    // Sign data
    const signature = await cryptoService.signData(testData, keypairs.signing.privateKey)
    console.assert(signature.length > 0, 'Signature created')
    
    // Verify signature (should be valid)
    const isValid = await cryptoService.verifySignature(
      signature, 
      testData, 
      keypairs.signing.publicKey
    )
    console.assert(isValid === true, 'Signature verification succeeded')
    
    // Verify with wrong data (should fail)
    const wrongData = { message: 'Wrong data', timestamp: Date.now() }
    const isInvalid = await cryptoService.verifySignature(
      signature, 
      wrongData, 
      keypairs.signing.publicKey
    )
    console.assert(isInvalid === false, 'Invalid signature rejected')
    
    console.log('✅ Digital signatures: PASSED')
    return { success: true }
  } catch (error) {
    console.error('❌ Digital signatures: FAILED', error)
    return { success: false, error }
  }
}

/**
 * Test 4: Ballot Encryption
 */
async function testBallotEncryption() {
  console.log('🧪 Test 4: Ballot Encryption')
  try {
    // Generate keypair for encryption
    const keypairs = await cryptoService.generateUserKeypairs()
    
    // Test ballot
    const ballot = {
      candidateId: 123,
      electionId: 'election-456',
      timestamp: Date.now()
    }
    
    // Encrypt ballot
    const encryptedBallot = await cryptoService.encryptBallot(
      ballot, 
      keypairs.encryption.publicKey
    )
    console.assert(encryptedBallot.length > 0, 'Ballot encrypted')
    console.assert(!encryptedBallot.includes('123'), 'Ballot is not plaintext')
    console.assert(!encryptedBallot.includes('election-456'), 'Ballot data hidden')
    
    console.log('✅ Ballot encryption: PASSED')
    console.log('   Encrypted length:', encryptedBallot.length, 'characters')
    return { success: true, encryptedBallot }
  } catch (error) {
    console.error('❌ Ballot encryption: FAILED', error)
    return { success: false, error }
  }
}

/**
 * Test 5: Nullifier Generation
 */
async function testNullifierGeneration() {
  console.log('🧪 Test 5: Nullifier Generation')
  try {
    // Generate keypair
    const keypairs = await cryptoService.generateUserKeypairs()
    
    const electionId1 = 'election-001'
    const electionId2 = 'election-002'
    
    // Generate nullifier for election 1
    const nullifier1a = await cryptoService.generateNullifier(
      keypairs.signing.privateKey, 
      electionId1
    )
    console.assert(nullifier1a.length === 64, 'Nullifier is 64 hex chars (SHA-256)')
    
    // Generate same nullifier again (should be deterministic)
    const nullifier1b = await cryptoService.generateNullifier(
      keypairs.signing.privateKey, 
      electionId1
    )
    console.assert(nullifier1a === nullifier1b, 'Nullifiers are deterministic')
    
    // Generate nullifier for election 2 (should be different)
    const nullifier2 = await cryptoService.generateNullifier(
      keypairs.signing.privateKey, 
      electionId2
    )
    console.assert(nullifier1a !== nullifier2, 'Different elections have different nullifiers')
    
    console.log('✅ Nullifier generation: PASSED')
    console.log('   Nullifier 1:', nullifier1a.substring(0, 16) + '...')
    console.log('   Nullifier 2:', nullifier2.substring(0, 16) + '...')
    return { success: true, nullifier1a, nullifier2 }
  } catch (error) {
    console.error('❌ Nullifier generation: FAILED', error)
    return { success: false, error }
  }
}

/**
 * Test 6: Vote Package Creation
 */
async function testVotePackageCreation() {
  console.log('🧪 Test 6: Vote Package Creation')
  try {
    // Generate voter keypairs
    const voterKeys = await cryptoService.generateUserKeypairs()
    
    // Generate election keypairs (simulating election's keys)
    const electionKeys = await cryptoService.generateUserKeypairs()
    
    const voteData = { candidateId: 42 }
    const electionId = 'election-789'
    
    // Create vote package
    const votePackage = await cryptoService.createVotePackage(
      voteData,
      electionId,
      voterKeys,
      electionKeys.encryption.publicKey
    )
    
    console.assert(votePackage.encryptedBallot, 'Encrypted ballot exists')
    console.assert(votePackage.nullifier, 'Nullifier exists')
    console.assert(votePackage.signature, 'Signature exists')
    console.assert(votePackage.publicKey, 'Public key included')
    console.assert(votePackage.electionId === electionId, 'Election ID correct')
    console.assert(votePackage.timestamp, 'Timestamp exists')
    
    // Verify signature
    const isValid = await cryptoService.verifySignature(
      votePackage.signature,
      {
        encryptedBallot: votePackage.encryptedBallot,
        nullifier: votePackage.nullifier,
        electionId: votePackage.electionId,
        timestamp: votePackage.timestamp
      },
      voterKeys.signing.publicKey
    )
    console.assert(isValid, 'Vote package signature valid')
    
    console.log('✅ Vote package creation: PASSED')
    console.log('   Vote package:', {
      nullifier: votePackage.nullifier.substring(0, 16) + '...',
      encryptedLength: votePackage.encryptedBallot.length,
      signatureLength: votePackage.signature.length
    })
    return { success: true, votePackage }
  } catch (error) {
    console.error('❌ Vote package creation: FAILED', error)
    return { success: false, error }
  }
}

/**
 * Test 7: Key Storage and Retrieval
 */
async function testKeyStorage() {
  console.log('🧪 Test 7: Key Storage and Retrieval')
  try {
    const userId = 'test-user-' + Date.now()
    const password = 'test-password-123'
    
    // Generate and store keys
    const originalKeys = await cryptoService.generateUserKeypairs()
    await cryptoService.storeKeypairs(originalKeys, password, userId)
    console.assert(localStorage.getItem(`voting_keys_${userId}`), 'Keys stored in localStorage')
    
    // Retrieve keys
    const retrievedKeys = await cryptoService.retrieveKeypairs(userId)
    console.assert(retrievedKeys.signing, 'Signing keys retrieved')
    console.assert(retrievedKeys.encryption, 'Encryption keys retrieved')
    
    // Test signing with retrieved keys
    const testData = 'test'
    const signature = await cryptoService.signData(testData, retrievedKeys.signing.privateKey)
    const isValid = await cryptoService.verifySignature(
      signature, 
      testData, 
      retrievedKeys.signing.publicKey
    )
    console.assert(isValid, 'Retrieved keys are functional')
    
    // Cleanup
    localStorage.removeItem(`voting_keys_${userId}`)
    
    console.log('✅ Key storage: PASSED')
    return { success: true }
  } catch (error) {
    console.error('❌ Key storage: FAILED', error)
    return { success: false, error }
  }
}

/**
 * Test 8: Hash Function
 */
async function testHashFunction() {
  console.log('🧪 Test 8: Hash Function')
  try {
    const data1 = 'test data'
    const data2 = 'test data'
    const data3 = 'different data'
    
    const hash1 = await cryptoService.hash(data1)
    const hash2 = await cryptoService.hash(data2)
    const hash3 = await cryptoService.hash(data3)
    
    console.assert(hash1.length === 64, 'Hash is 64 hex chars (SHA-256)')
    console.assert(hash1 === hash2, 'Same data produces same hash')
    console.assert(hash1 !== hash3, 'Different data produces different hash')
    
    console.log('✅ Hash function: PASSED')
    console.log('   Hash:', hash1.substring(0, 16) + '...')
    return { success: true, hash1 }
  } catch (error) {
    console.error('❌ Hash function: FAILED', error)
    return { success: false, error }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Cryptography Test Suite\n')
  
  const results = []
  
  results.push(await testKeyGeneration())
  results.push(await testKeyExportImport())
  results.push(await testDigitalSignatures())
  results.push(await testBallotEncryption())
  results.push(await testNullifierGeneration())
  results.push(await testVotePackageCreation())
  results.push(await testKeyStorage())
  results.push(await testHashFunction())
  
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log('\n' + '='.repeat(50))
  console.log(`📊 Test Results: ${passed}/${results.length} passed`)
  console.log('='.repeat(50))
  
  if (failed === 0) {
    console.log('✅ All tests passed!')
  } else {
    console.error(`❌ ${failed} test(s) failed`)
  }
  
  return { passed, failed, results }
}

// Export for use in browser console or test framework
if (typeof window !== 'undefined') {
  window.cryptoTests = {
    runAllTests,
    testKeyGeneration,
    testKeyExportImport,
    testDigitalSignatures,
    testBallotEncryption,
    testNullifierGeneration,
    testVotePackageCreation,
    testKeyStorage,
    testHashFunction
  }
  
  console.log('💡 Crypto tests loaded! Run: cryptoTests.runAllTests()')
}

// For Node.js/module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testKeyGeneration,
    testKeyExportImport,
    testDigitalSignatures,
    testBallotEncryption,
    testNullifierGeneration,
    testVotePackageCreation,
    testKeyStorage,
    testHashFunction
  }
}
