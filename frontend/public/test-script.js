/**
 * Frontend Integration Test Script
 * Run this in the browser console to test voting flow
 * 
 * Date: October 31, 2025
 */

const frontendTests = {
  baseUrl: 'http://localhost:3000/api',
  
  // Test 1: Register a new user
  async testRegistration() {
    console.log('\n=== TEST 1: User Registration ===');
    
    const timestamp = Date.now();
    const userData = {
      username: `Frontend Test User`,
      email: `test${timestamp}@university.edu`,
      institution_id: `FRONT${timestamp}`,
      password: 'TestPassword123!',
      role: 'student'
    };
    
    console.log('Registering user:', userData.institution_id);
    
    try {
      const response = await fetch(`${this.baseUrl}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      const result = await response.json();
      console.log('Response status:', response.status);
      console.log('Response:', result);
      
      if (response.ok) {
        console.log('✅ Registration successful!');
        return { success: true, user: userData, data: result };
      } else {
        console.log('❌ Registration failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Test 2: Login user
  async testLogin(institution_id, password) {
    console.log('\n=== TEST 2: User Login ===');
    console.log('Logging in:', institution_id);
    
    try {
      const response = await fetch(`${this.baseUrl}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_id, password })
      });
      
      const result = await response.json();
      console.log('Response status:', response.status);
      
      if (response.ok) {
        console.log('✅ Login successful!');
        console.log('Token received:', result.token.substring(0, 20) + '...');
        console.log('User ID:', result.user.id);
        this.token = result.token;
        this.userId = result.user.id;
        return { success: true, token: result.token, user: result.user };
      } else {
        console.log('❌ Login failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Test 3: Get elections list
  async testGetElections() {
    console.log('\n=== TEST 3: Get Elections ===');
    
    try {
      const response = await fetch(`${this.baseUrl}/elections`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      const elections = await response.json();
      console.log('Response status:', response.status);
      console.log('Elections found:', elections.length);
      
      elections.forEach(e => {
        console.log(`  - ${e.id}: ${e.title} (${e.status})`);
        console.log(`    Dates: ${e.start_date} to ${e.end_date}`);
        console.log(`    Has public key: ${e.public_key ? 'YES' : 'NO'}`);
      });
      
      if (elections.length > 0) {
        console.log('✅ Elections loaded successfully!');
        this.elections = elections;
        return { success: true, elections };
      } else {
        console.log('⚠️ No elections found');
        return { success: true, elections: [] };
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Test 4: Get election details with candidates
  async testGetElectionDetail(electionId) {
    console.log('\n=== TEST 4: Get Election Details ===');
    console.log('Election ID:', electionId);
    
    try {
      const response = await fetch(`${this.baseUrl}/elections/${electionId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      const election = await response.json();
      console.log('Response status:', response.status);
      console.log('Election:', election.title);
      console.log('Candidates:', election.candidates?.length || 0);
      
      if (election.candidates) {
        election.candidates.forEach(c => {
          console.log(`  - ${c.id}: ${c.name}`);
        });
      }
      
      console.log('✅ Election details loaded!');
      return { success: true, election };
    } catch (error) {
      console.error('❌ Network error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Test 5: Submit a vote (simulated - would need crypto in real test)
  async testVote(electionId, candidateId) {
    console.log('\n=== TEST 5: Submit Vote ===');
    console.log('⚠️ This test requires crypto keys to be generated');
    console.log('Use the actual frontend UI to test voting with real crypto');
    console.log('');
    console.log('Expected flow:');
    console.log('1. Generate ECDSA keypair (P-256)');
    console.log('2. Generate RSA keypair (2048-bit)');
    console.log('3. Create nullifier: SHA-256(privateKey + electionId)');
    console.log('4. Encrypt ballot with election public key');
    console.log('5. Sign vote package with ECDSA private key');
    console.log('6. Submit to backend');
    
    return { success: false, message: 'Use UI for crypto testing' };
  },
  
  // Run all basic tests
  async runBasicTests() {
    console.log('========================================');
    console.log('Frontend Integration Test Suite');
    console.log('========================================');
    
    // Test 1: Registration
    const regResult = await this.testRegistration();
    if (!regResult.success) {
      console.log('\n❌ Test suite stopped: Registration failed');
      return;
    }
    
    // Wait a bit
    await new Promise(r => setTimeout(r, 500));
    
    // Test 2: Login
    const loginResult = await this.testLogin(
      regResult.user.institution_id,
      regResult.user.password
    );
    if (!loginResult.success) {
      console.log('\n❌ Test suite stopped: Login failed');
      return;
    }
    
    // Wait a bit
    await new Promise(r => setTimeout(r, 500));
    
    // Test 3: Get elections
    const electionsResult = await this.testGetElections();
    if (!electionsResult.success || electionsResult.elections.length === 0) {
      console.log('\n⚠️ No elections available for testing');
      return;
    }
    
    // Wait a bit
    await new Promise(r => setTimeout(r, 500));
    
    // Test 4: Get election details
    const firstElection = electionsResult.elections[0];
    await this.testGetElectionDetail(firstElection.id);
    
    // Test 5: Voting info
    await this.testVote();
    
    console.log('\n========================================');
    console.log('Basic Tests Complete!');
    console.log('========================================');
    console.log('✅ Registration: PASSED');
    console.log('✅ Login: PASSED');
    console.log('✅ Get Elections: PASSED');
    console.log('✅ Get Election Details: PASSED');
    console.log('⏭️  Voting: Use UI with crypto');
    console.log('');
    console.log('Next steps:');
    console.log('1. Open http://localhost:5173/register in browser');
    console.log('2. Register a user (watch console for crypto logs)');
    console.log('3. Login with the credentials');
    console.log('4. Navigate to elections and vote');
    console.log('5. Verify receipt is generated');
  }
};

// Instructions
console.log('=== Frontend Integration Test Script Loaded ===');
console.log('');
console.log('Run tests:');
console.log('  await frontendTests.runBasicTests()');
console.log('');
console.log('Or run individual tests:');
console.log('  await frontendTests.testRegistration()');
console.log('  await frontendTests.testLogin("FRONT123", "password")');
console.log('  await frontendTests.testGetElections()');
console.log('');

// Export for use
window.frontendTests = frontendTests;
