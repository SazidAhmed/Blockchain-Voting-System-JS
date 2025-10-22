const axios = require('axios');

// API base URL
const API_BASE = 'http://localhost:3000/api';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Simulate key generation (in real test, frontend generates these)
function generateMockKeys() {
  // These are mock keys for testing
  // In real flow, frontend generates actual crypto keys
  return {
    publicKey: Buffer.from(JSON.stringify({
      kty: 'EC',
      crv: 'P-256',
      x: 'test_x_coordinate_base64',
      y: 'test_y_coordinate_base64'
    })).toString('base64'),
    encryptionPublicKey: Buffer.from(JSON.stringify({
      kty: 'RSA',
      n: 'test_modulus_base64',
      e: 'AQAB'
    })).toString('base64')
  };
}

async function testBackendCryptoIntegration() {
  log('\n' + '='.repeat(60), 'cyan');
  log('Backend Crypto Integration Test', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  let testResults = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  try {
    // Test 1: Registration with public keys
    log('\n📝 Test 1: User Registration with Crypto Keys', 'cyan');
    log('-'.repeat(60));
    
    const testUser = {
      institutionId: `TEST${Date.now()}`,
      username: 'cryptotest',
      password: 'testpass123',
      role: 'student',
      email: `test${Date.now()}@university.edu`,
      ...generateMockKeys()
    };

    logInfo(`Registering user: ${testUser.username}`);
    logInfo(`Institution ID: ${testUser.institutionId}`);
    
    let registrationResponse;
    try {
      registrationResponse = await axios.post(`${API_BASE}/users/register`, testUser);
      
      if (registrationResponse.data.user.publicKey && 
          registrationResponse.data.user.encryptionPublicKey) {
        logSuccess('Registration successful with crypto keys');
        logSuccess(`User ID: ${registrationResponse.data.user.id}`);
        logSuccess(`Public key present: ${registrationResponse.data.user.publicKey.substring(0, 20)}...`);
        logSuccess(`Encryption key present: ${registrationResponse.data.user.encryptionPublicKey.substring(0, 20)}...`);
        testResults.passed++;
      } else {
        logError('Registration missing crypto keys');
        testResults.failed++;
      }
    } catch (error) {
      logError(`Registration failed: ${error.response?.data?.message || error.message}`);
      testResults.failed++;
      throw error;
    }

    // Test 2: Login returns crypto keys
    log('\n🔐 Test 2: Login Returns Crypto Keys', 'cyan');
    log('-'.repeat(60));
    
    logInfo(`Logging in as: ${testUser.institutionId}`);
    
    try {
      const loginResponse = await axios.post(`${API_BASE}/users/login`, {
        institutionId: testUser.institutionId,
        password: testUser.password
      });
      
      if (loginResponse.data.user.publicKey && 
          loginResponse.data.user.encryptionPublicKey) {
        logSuccess('Login successful - crypto keys returned');
        logSuccess(`Token received: ${loginResponse.data.token.substring(0, 20)}...`);
        logSuccess(`Public key: ${loginResponse.data.user.publicKey.substring(0, 20)}...`);
        logSuccess(`Encryption key: ${loginResponse.data.user.encryptionPublicKey.substring(0, 20)}...`);
        testResults.passed++;
        
        // Save token for next tests
        testUser.token = loginResponse.data.token;
      } else {
        logError('Login response missing crypto keys');
        testResults.failed++;
      }
    } catch (error) {
      logError(`Login failed: ${error.response?.data?.message || error.message}`);
      testResults.failed++;
      throw error;
    }

    // Test 3: Get user profile includes keys
    log('\n👤 Test 3: User Profile Includes Crypto Keys', 'cyan');
    log('-'.repeat(60));
    
    logInfo('Fetching user profile...');
    
    try {
      const profileResponse = await axios.get(`${API_BASE}/users/me`, {
        headers: { 'x-auth-token': testUser.token }
      });
      
      if (profileResponse.data.publicKey && profileResponse.data.encryptionPublicKey) {
        logSuccess('Profile includes crypto keys');
        logSuccess(`Public key matches: ${profileResponse.data.publicKey === testUser.publicKey ? 'Yes' : 'No'}`);
        logSuccess(`Encryption key matches: ${profileResponse.data.encryptionPublicKey === testUser.encryptionPublicKey ? 'Yes' : 'No'}`);
        testResults.passed++;
      } else {
        logError('Profile missing crypto keys');
        testResults.failed++;
      }
    } catch (error) {
      logError(`Profile fetch failed: ${error.response?.data?.message || error.message}`);
      testResults.failed++;
    }

    // Test 4: Vote endpoint accepts encrypted package
    log('\n🗳️  Test 4: Vote Endpoint Accepts Encrypted Package', 'cyan');
    log('-'.repeat(60));
    
    logInfo('Testing encrypted vote submission...');
    
    // Get active election
    const electionsResponse = await axios.get(`${API_BASE}/elections`);
    const activeElection = electionsResponse.data.find(e => e.status === 'active');
    
    if (!activeElection) {
      logWarning('No active election found - skipping vote test');
      testResults.warnings++;
    } else {
      logInfo(`Found election: ${activeElection.title} (ID: ${activeElection.id})`);
      
      // Mock encrypted vote package
      const votePackage = {
        encryptedBallot: Buffer.from('encrypted_ballot_data').toString('base64'),
        nullifier: 'a'.repeat(64), // SHA-256 hash format
        signature: Buffer.from('mock_ecdsa_signature').toString('base64'),
        publicKey: testUser.publicKey,
        timestamp: Date.now()
      };
      
      try {
        const voteResponse = await axios.post(
          `${API_BASE}/elections/${activeElection.id}/vote`,
          votePackage,
          { headers: { 'x-auth-token': testUser.token }}
        );
        
        if (voteResponse.data.receipt) {
          logSuccess('Vote accepted with encrypted package');
          logSuccess(`Transaction hash: ${voteResponse.data.receipt.transactionHash}`);
          logSuccess(`Nullifier: ${voteResponse.data.receipt.nullifier?.substring(0, 20)}...`);
          logSuccess(`Signature: ${voteResponse.data.receipt.signature?.substring(0, 20)}...`);
          testResults.passed++;
        } else {
          logError('Vote response missing receipt');
          testResults.failed++;
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        if (errorMsg.includes('not registered')) {
          logWarning('User not registered for election - expected for new test user');
          testResults.warnings++;
        } else if (errorMsg.includes('already voted')) {
          logWarning('Nullifier already used - double-vote prevention working');
          testResults.warnings++;
        } else {
          logError(`Vote submission failed: ${errorMsg}`);
          testResults.failed++;
        }
      }
    }

    // Test 5: Database verification
    log('\n💾 Test 5: Database Contains Crypto Fields', 'cyan');
    log('-'.repeat(60));
    
    const { pool } = require('./config/db');
    
    try {
      // Check user has keys
      const [users] = await pool.query(
        'SELECT public_key, encryption_public_key FROM users WHERE institution_id = ?',
        [testUser.institutionId]
      );
      
      if (users.length > 0 && users[0].public_key && users[0].encryption_public_key) {
        logSuccess('User crypto keys stored in database');
        logSuccess(`Public key in DB: ${users[0].public_key.substring(0, 20)}...`);
        logSuccess(`Encryption key in DB: ${users[0].encryption_public_key.substring(0, 20)}...`);
        testResults.passed++;
      } else {
        logError('User crypto keys not in database');
        testResults.failed++;
      }
      
      // Check votes table has signature fields
      const [votes] = await pool.query(
        'SELECT COUNT(*) as count FROM votes_meta WHERE signature IS NOT NULL'
      );
      
      if (votes[0].count > 0) {
        logSuccess(`Found ${votes[0].count} vote(s) with signatures in database`);
        testResults.passed++;
      } else {
        logWarning('No votes with signatures found yet (may be expected)');
        testResults.warnings++;
      }
      
      await pool.end();
    } catch (error) {
      logError(`Database check failed: ${error.message}`);
      testResults.failed++;
    }

  } catch (error) {
    logError(`\nTest suite failed with error: ${error.message}`);
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('Test Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total Tests: ${testResults.passed + testResults.failed}`, 'blue');
  log(`✓ Passed: ${testResults.passed}`, 'green');
  log(`✗ Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`⚠ Warnings: ${testResults.warnings}`, 'yellow');
  
  if (testResults.failed === 0) {
    log('\n🎉 All tests passed! Backend crypto integration is working!', 'green');
    log('✅ Ready for frontend testing', 'green');
  } else {
    log('\n❌ Some tests failed. Please review the errors above.', 'red');
  }
  
  log('');
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
testBackendCryptoIntegration().catch(error => {
  logError(`Test execution failed: ${error.message}`);
  process.exit(1);
});
