const axios = require('axios');
const { pool } = require('./config/db');

const API_BASE = 'http://localhost:3000/api';

// Test data
const testUser = {
  institutionId: 'TEST' + Date.now(),
  username: 'cryptotester',
  password: 'test123',
  role: 'student',
  email: `test${Date.now()}@university.edu`,
  // Simulated public keys (in real app, these come from Web Crypto API)
  publicKey: 'eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6InRlc3RfeCIsInkiOiJ0ZXN0X3kifQ==',
  encryptionPublicKey: 'eyJrdHkiOiJSU0EiLCJuIjoidGVzdF9uIiwiZSI6IkFRQUIifQ=='
};

let authToken = '';
let userId = 0;

async function testRegistration() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: User Registration with Public Keys');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.post(`${API_BASE}/users/register`, testUser);
    
    if (response.data.token && response.data.user) {
      authToken = response.data.token;
      userId = response.data.user.id;
      
      console.log('✅ Registration successful!');
      console.log(`   User ID: ${userId}`);
      console.log(`   Username: ${response.data.user.username}`);
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
      
      // Check if keys were stored
      if (response.data.user.publicKey && response.data.user.encryptionPublicKey) {
        console.log('✅ Public keys returned from server');
        console.log(`   Signing Key: ${response.data.user.publicKey.substring(0, 30)}...`);
        console.log(`   Encryption Key: ${response.data.user.encryptionPublicKey.substring(0, 30)}...`);
      }
      
      // Verify in database
      const [users] = await pool.query(
        'SELECT public_key, encryption_public_key FROM users WHERE id = ?',
        [userId]
      );
      
      if (users[0].public_key && users[0].encryption_public_key) {
        console.log('✅ Keys stored in database');
      } else {
        console.log('❌ Keys NOT stored in database');
      }
      
      return true;
    }
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: User Login');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.post(`${API_BASE}/users/login`, {
      institutionId: testUser.institutionId,
      password: testUser.password
    });
    
    if (response.data.token && response.data.user) {
      authToken = response.data.token;
      
      console.log('✅ Login successful!');
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
      console.log(`   User: ${response.data.user.username}`);
      
      // Check if keys are returned
      if (response.data.user.publicKey && response.data.user.encryptionPublicKey) {
        console.log('✅ Public keys returned in login response');
      } else {
        console.log('⚠️  Keys not returned (might be OK for legacy users)');
      }
      
      return true;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testElectionRegistration() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Election Registration');
  console.log('='.repeat(60));
  
  try {
    // Get the latest election
    const [elections] = await pool.query(
      'SELECT id, title FROM elections WHERE status = "active" ORDER BY id DESC LIMIT 1'
    );
    
    if (elections.length === 0) {
      console.log('❌ No active elections found');
      return false;
    }
    
    const electionId = elections[0].id;
    console.log(`   Election: ${elections[0].title} (ID: ${electionId})`);
    
    // Register for election
    const response = await axios.post(
      `${API_BASE}/elections/${electionId}/register`,
      {},
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    if (response.data.message) {
      console.log('✅ Registered for election');
      console.log(`   Token: ${response.data.registrationToken?.substring(0, 20)}...`);
      return electionId;
    }
  } catch (error) {
    console.log('❌ Election registration failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testEncryptedVoting(electionId) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Encrypted Vote Submission');
  console.log('='.repeat(60));
  
  try {
    // Get candidates
    const [candidates] = await pool.query(
      'SELECT id, name FROM candidates WHERE election_id = ? LIMIT 1',
      [electionId]
    );
    
    if (candidates.length === 0) {
      console.log('❌ No candidates found');
      return false;
    }
    
    const candidateId = candidates[0].id;
    console.log(`   Voting for: ${candidates[0].name} (ID: ${candidateId})`);
    
    // Simulate encrypted vote package (in real app, this comes from Web Crypto API)
    const votePackage = {
      encryptedBallot: 'U2FsdGVkX1+encrypted_ballot_data_here_' + Date.now(),
      nullifier: require('crypto').createHash('sha256').update(`${userId}-${electionId}-${Date.now()}`).digest('hex'),
      signature: 'MEUCIQD5F1_simulated_ecdsa_signature_' + Date.now(),
      publicKey: testUser.publicKey,
      timestamp: Date.now()
    };
    
    console.log(`   Encrypted Ballot: ${votePackage.encryptedBallot.substring(0, 40)}...`);
    console.log(`   Nullifier: ${votePackage.nullifier.substring(0, 40)}...`);
    console.log(`   Signature: ${votePackage.signature.substring(0, 40)}...`);
    
    // Submit vote
    const response = await axios.post(
      `${API_BASE}/elections/${electionId}/vote`,
      votePackage,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    if (response.data.message) {
      console.log('✅ Vote submitted successfully!');
      console.log(`   Message: ${response.data.message}`);
      
      if (response.data.receipt) {
        console.log('✅ Receipt received:');
        console.log(`   Transaction Hash: ${response.data.receipt.transactionHash?.substring(0, 40)}...`);
        console.log(`   Nullifier: ${response.data.receipt.nullifier?.substring(0, 40)}...`);
        console.log(`   Signature: ${response.data.receipt.signature?.substring(0, 40)}...`);
        console.log(`   Timestamp: ${response.data.receipt.timestamp}`);
      }
      
      return votePackage.nullifier;
    }
  } catch (error) {
    console.log('❌ Vote submission failed:', error.response?.data?.message || error.message);
    console.log('   Full error:', error.response?.data);
    return false;
  }
}

async function testDoubleVotePrevention(electionId) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Double-Vote Prevention');
  console.log('='.repeat(60));
  
  try {
    // Try to vote again with same nullifier
    const votePackage = {
      encryptedBallot: 'U2FsdGVkX1+another_ballot_' + Date.now(),
      nullifier: require('crypto').createHash('sha256').update(`${userId}-${electionId}-duplicate`).digest('hex'),
      signature: 'MEUCIQD5F1_signature_' + Date.now(),
      publicKey: testUser.publicKey,
      timestamp: Date.now()
    };
    
    const response = await axios.post(
      `${API_BASE}/elections/${electionId}/vote`,
      votePackage,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );
    
    console.log('❌ Double-vote was NOT prevented (should have been blocked)');
    return false;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already voted')) {
      console.log('✅ Double-vote correctly prevented!');
      console.log(`   Error: ${error.response.data.message}`);
      return true;
    } else {
      console.log('⚠️  Unexpected error:', error.response?.data?.message || error.message);
      return false;
    }
  }
}

async function testDatabaseStorage(nullifier) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 6: Database Storage Verification');
  console.log('='.repeat(60));
  
  try {
    // Check votes_meta table
    const [votes] = await pool.query(
      'SELECT * FROM votes_meta WHERE nullifier_hash = ?',
      [nullifier]
    );
    
    if (votes.length > 0) {
      const vote = votes[0];
      console.log('✅ Vote found in votes_meta table');
      console.log(`   ID: ${vote.id}`);
      console.log(`   Election ID: ${vote.election_id}`);
      console.log(`   Encrypted Ballot: ${vote.encrypted_ballot?.substring(0, 40)}...`);
      console.log(`   Signature: ${vote.signature ? vote.signature.substring(0, 40) + '...' : 'NULL'}`);
      console.log(`   Public Key: ${vote.voter_public_key ? vote.voter_public_key.substring(0, 40) + '...' : 'NULL'}`);
      console.log(`   Transaction Hash: ${vote.tx_hash?.substring(0, 40)}...`);
      
      // Check if signature and public key are stored
      if (vote.signature && vote.voter_public_key) {
        console.log('✅ Signature and public key stored correctly');
      } else {
        console.log('⚠️  Signature or public key missing');
      }
    } else {
      console.log('❌ Vote NOT found in database');
      return false;
    }
    
    // Check vote_receipts table
    const [receipts] = await pool.query(
      'SELECT * FROM vote_receipts WHERE nullifier_hash = ?',
      [nullifier]
    );
    
    if (receipts.length > 0) {
      console.log('✅ Receipt stored in vote_receipts table');
    } else {
      console.log('⚠️  Receipt not found (might be OK)');
    }
    
    // Check voter_registrations status
    const [registrations] = await pool.query(
      'SELECT status, voted_at FROM voter_registrations WHERE user_id = ?',
      [userId]
    );
    
    if (registrations.length > 0 && registrations[0].status === 'voted') {
      console.log('✅ Voter registration status updated to "voted"');
      console.log(`   Voted at: ${registrations[0].voted_at}`);
    } else {
      console.log('⚠️  Registration status not updated');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Database verification failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '█'.repeat(60));
  console.log('🧪 ENCRYPTED VOTING SYSTEM - END-TO-END TEST');
  console.log('█'.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  
  const results = {
    registration: false,
    login: false,
    electionRegistration: false,
    voting: false,
    doubleVotePrevention: false,
    databaseStorage: false
  };
  
  try {
    // Test 1: Registration
    results.registration = await testRegistration();
    if (!results.registration) {
      console.log('\n❌ Registration failed. Stopping tests.');
      return;
    }
    
    // Test 2: Login
    results.login = await testLogin();
    if (!results.login) {
      console.log('\n❌ Login failed. Stopping tests.');
      return;
    }
    
    // Test 3: Election Registration
    const electionId = await testElectionRegistration();
    results.electionRegistration = !!electionId;
    if (!electionId) {
      console.log('\n❌ Election registration failed. Stopping tests.');
      return;
    }
    
    // Test 4: Encrypted Voting
    const nullifier = await testEncryptedVoting(electionId);
    results.voting = !!nullifier;
    if (!nullifier) {
      console.log('\n❌ Voting failed. Stopping tests.');
      return;
    }
    
    // Test 5: Double-Vote Prevention
    results.doubleVotePrevention = await testDoubleVotePrevention(electionId);
    
    // Test 6: Database Storage
    results.databaseStorage = await testDatabaseStorage(nullifier);
    
  } catch (error) {
    console.log('\n❌ Unexpected error:', error.message);
  }
  
  // Summary
  console.log('\n' + '█'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('█'.repeat(60));
  
  const tests = [
    { name: 'Registration with Keys', result: results.registration },
    { name: 'Login', result: results.login },
    { name: 'Election Registration', result: results.electionRegistration },
    { name: 'Encrypted Voting', result: results.voting },
    { name: 'Double-Vote Prevention', result: results.doubleVotePrevention },
    { name: 'Database Storage', result: results.databaseStorage }
  ];
  
  tests.forEach(test => {
    const icon = test.result ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
  });
  
  const passedTests = tests.filter(t => t.result).length;
  const totalTests = tests.length;
  const percentage = Math.round((passedTests / totalTests) * 100);
  
  console.log('\n' + '─'.repeat(60));
  console.log(`Results: ${passedTests}/${totalTests} tests passed (${percentage}%)`);
  console.log('─'.repeat(60));
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Encrypted voting system is working correctly!');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Review the errors above.`);
  }
  
  console.log(`\nCompleted at: ${new Date().toISOString()}`);
  console.log('█'.repeat(60) + '\n');
  
  await pool.end();
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
