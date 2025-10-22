const axios = require('axios');
const crypto = require('crypto');

const API_BASE = 'http://localhost:3000/api';

async function testReceiptUI() {
  console.log('🧪 Testing Vote Receipt UI Flow\n');
  
  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/users/login`, {
      institutionId: '12345',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login successful');
    console.log('   User:', user.username);
    console.log('   Token:', token.substring(0, 20) + '...\n');
    
    // Step 2: Get elections
    console.log('Step 2: Fetching elections...');
    const electionsResponse = await axios.get(`${API_BASE}/elections`, {
      headers: { 'x-auth-token': token }
    });
    
    const activeElections = electionsResponse.data.filter(e => e.status === 'active');
    console.log(`✅ Found ${activeElections.length} active elections\n`);
    
    if (activeElections.length === 0) {
      console.log('⚠️  No active elections found. Create one first.');
      return;
    }
    
    // Find an election the user hasn't voted in
    let targetElection = null;
    for (const election of activeElections) {
      // Get election details including voter registration
      const detailResponse = await axios.get(`${API_BASE}/elections/${election.id}`, {
        headers: { 'x-auth-token': token }
      });
      
      // Check if user can still vote
      if (detailResponse.data.canVote !== false) {
        targetElection = detailResponse.data;
        break;
      }
    }
    
    if (!targetElection) {
      console.log('⚠️  User has already voted in all elections.');
      console.log('📝 Create a new election to test receipt UI.\n');
      return;
    }
    
    console.log(`✅ Found election to vote in: "${targetElection.title}" (ID: ${targetElection.id})\n`);
    
    // Step 3: Check candidates
    if (!targetElection.candidates || targetElection.candidates.length === 0) {
      console.log('❌ No candidates found in election');
      return;
    }
    
    const selectedCandidate = targetElection.candidates[0];
    console.log(`Step 3: Selected candidate: ${selectedCandidate.name}\n`);
    
    // Step 4: Create mock vote package (since we don't have actual crypto keys in this test)
    console.log('Step 4: Creating vote package...');
    
    // Generate mock crypto data
    const ballot = { candidateId: selectedCandidate.id, timestamp: Date.now() };
    const encryptedBallot = Buffer.from(JSON.stringify(ballot)).toString('base64');
    const nullifier = crypto.randomBytes(32).toString('hex');
    const signature = crypto.randomBytes(64).toString('base64');
    const publicKey = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEI47ij1DgNsB7bMJ1wo6kyr4qSHeo+iabe3Td2tnA9lX2ukcV7Gysd414AtLdz6OCfwrdmNEXxuGOQ8cZYKo7ow==';
    
    const votePackage = {
      encryptedBallot,
      nullifier,
      signature,
      publicKey,
      timestamp: Date.now()
    };
    
    console.log('✅ Vote package created');
    console.log('   Encrypted Ballot Length:', encryptedBallot.length);
    console.log('   Nullifier Length:', nullifier.length);
    console.log('   Signature Length:', signature.length);
    console.log('   Public Key Length:', publicKey.length);
    console.log();
    
    // Step 5: Submit vote
    console.log('Step 5: Submitting vote...');
    const voteResponse = await axios.post(
      `${API_BASE}/elections/${targetElection.id}/vote`,
      votePackage,
      { headers: { 'x-auth-token': token } }
    );
    
    console.log('✅ Vote submitted successfully!\n');
    
    // Step 6: Verify receipt
    console.log('Step 6: Verifying receipt data...\n');
    console.log('=== VOTE RECEIPT ===');
    
    const receipt = voteResponse.data.receipt;
    
    if (!receipt) {
      console.log('❌ ERROR: No receipt returned from server!');
      console.log('Response:', JSON.stringify(voteResponse.data, null, 2));
      return;
    }
    
    console.log('✅ Receipt received from server\n');
    
    // Check required fields
    const checks = {
      'Transaction Hash': receipt.transactionHash || receipt.txHash,
      'Nullifier': receipt.nullifier,
      'Timestamp': receipt.timestamp,
      'Signature': receipt.signature,
      'Block Index': receipt.blockIndex !== undefined
    };
    
    console.log('📋 Receipt Fields:');
    for (const [field, value] of Object.entries(checks)) {
      if (value) {
        console.log(`   ✅ ${field}: ${typeof value === 'string' && value.length > 40 ? value.substring(0, 40) + '...' : value}`);
      } else {
        console.log(`   ❌ ${field}: MISSING`);
      }
    }
    
    console.log('\n=== FULL RECEIPT DATA ===');
    console.log(JSON.stringify(receipt, null, 2));
    
    console.log('\n=== UI COMPONENT TEST ===');
    console.log('The VoteReceipt component should display:');
    console.log('  📄 Transaction Hash:', (receipt.transactionHash || receipt.txHash) ? '✅' : '❌');
    console.log('  🔒 Nullifier:', receipt.nullifier ? '✅' : '❌');
    console.log('  📅 Timestamp:', receipt.timestamp ? '✅' : '❌');
    console.log('  ✍️  Digital Signature:', receipt.signature ? '✅' : '❌');
    console.log('  💾 Download Button: Should be functional');
    console.log('  🖨️  Print Button: Should be functional');
    
    console.log('\n✅ Receipt UI test complete!');
    console.log('\n📌 Next steps:');
    console.log('   1. Open browser to http://localhost:5173');
    console.log('   2. Login with institutionId: 12345, password: password');
    console.log('   3. Navigate to any election you haven\'t voted in');
    console.log('   4. Cast a vote and verify the receipt displays correctly');
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testReceiptUI();
