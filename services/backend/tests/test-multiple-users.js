const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../config/db');

const API_BASE = 'http://localhost:3000/api';

// Helper function to create a vote
async function castVote(institutionId, password, electionId) {
  console.log(`\n📝 Testing vote for user: ${institutionId}`);
  
  // Login
  const loginResponse = await axios.post(`${API_BASE}/users/login`, {
    institutionId,
    password
  });
  
  const token = loginResponse.data.token;
  const user = loginResponse.data.user;
  console.log(`   ✅ Logged in as: ${user.username}`);
  
  // Create mock vote package
  const nullifier = crypto.randomBytes(32).toString('hex');
  const encryptedBallot = Buffer.from(JSON.stringify({ candidateId: 1 })).toString('base64');
  const signature = crypto.randomBytes(64).toString('base64');
  const publicKey = crypto.randomBytes(64).toString('base64');
  
  // Submit vote
  const voteResponse = await axios.post(
    `${API_BASE}/elections/${electionId}/vote`,
    {
      encryptedBallot,
      nullifier,
      signature,
      publicKey,
      timestamp: Date.now()
    },
    { headers: { 'x-auth-token': token } }
  );
  
  console.log(`   ✅ Vote submitted successfully`);
  console.log(`   📋 Transaction Hash: ${voteResponse.data.receipt.transactionHash.substring(0, 20)}...`);
  console.log(`   🔒 Nullifier: ${voteResponse.data.receipt.nullifier.substring(0, 20)}...`);
  
  return {
    userId: user.id,
    nullifier: voteResponse.data.receipt.nullifier,
    transactionHash: voteResponse.data.receipt.transactionHash
  };
}

// Main test function
async function testMultipleUsers() {
  console.log('🧪 Testing Multiple Users Voting\n');
  console.log('=' .repeat(50));
  
  try {
    // Test User 1
    console.log('\n👤 User 1: institution_id 12345');
    const user1Result = await castVote('12345', 'password', 4);
    
    // Test User 2
    console.log('\n👤 User 2: institution_id 54321');
    const user2Result = await castVote('54321', 'password123', 4);
    
    // Verify different nullifiers
    console.log('\n' + '='.repeat(50));
    console.log('📊 Verification Results:');
    console.log('='.repeat(50));
    
    if (user1Result.nullifier !== user2Result.nullifier) {
      console.log('✅ Different nullifiers generated for each user');
      console.log(`   User 1 nullifier: ${user1Result.nullifier.substring(0, 30)}...`);
      console.log(`   User 2 nullifier: ${user2Result.nullifier.substring(0, 30)}...`);
    } else {
      console.log('❌ ERROR: Same nullifier for both users!');
    }
    
    if (user1Result.transactionHash !== user2Result.transactionHash) {
      console.log('✅ Different transaction hashes for each vote');
    } else {
      console.log('❌ ERROR: Same transaction hash for both votes!');
    }
    
    // Query database to verify
    console.log('\n📈 Database Verification:');
    const [votes] = await pool.query(
      'SELECT id, LEFT(nullifier_hash, 20) as nullifier_preview, LEFT(tx_hash, 20) as tx_preview FROM votes_meta WHERE election_id = ? ORDER BY id DESC LIMIT 5',
      [4]
    );
    
    console.log('   Recent votes in election 4:');
    votes.forEach((vote, i) => {
      console.log(`   ${i + 1}. Vote ID ${vote.id}: Nullifier ${vote.nullifier_preview}... TX ${vote.tx_preview}...`);
    });
    
    // Test double-vote prevention for User 1
    console.log('\n🛡️  Testing Double-Vote Prevention:');
    console.log('   Attempting to vote again with User 1...');
    
    try {
      await castVote('12345', 'password', 4);
      console.log('   ❌ ERROR: Double vote was allowed!');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('   ✅ Double-vote correctly prevented');
        console.log(`   Error message: "${error.response.data.message}"`);
      } else {
        console.log('   ❌ Unexpected error:', error.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Multiple User Test Complete!');
    console.log('='.repeat(50));
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testMultipleUsers();
