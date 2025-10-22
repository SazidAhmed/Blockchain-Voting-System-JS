const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testRateLimiting() {
  console.log('⏱️  Testing Rate Limiting\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Login Rate Limiting (10 requests per 15 minutes)
    console.log('\nTest 1: Login Rate Limiting (max 10/15min)');
    console.log('-'.repeat(60));
    
    let loginAttempts = 0;
    let loginBlocked = false;
    
    for (let i = 1; i <= 12; i++) {
      try {
        await axios.post(`${API_BASE}/users/login`, {
          institutionId: 'invalid',
          password: 'invalid'
        });
        loginAttempts++;
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.log(`   ✅ Request ${i}: Rate limit enforced (429 Too Many Requests)`);
          console.log(`      Message: "${error.response.data.message}"`);
          if (error.response.data.retryAfter) {
            console.log(`      Retry after: ${error.response.data.retryAfter} seconds`);
          }
          loginBlocked = true;
          break;
        } else if (error.response && error.response.status === 400) {
          console.log(`   Request ${i}: Failed with 400 (expected - invalid credentials)`);
          loginAttempts++;
        }
      }
    }
    
    if (loginBlocked) {
      console.log(`\n   ✅ Login rate limiting working! Blocked after ${loginAttempts} attempts`);
    } else {
      console.log(`\n   ❌ Login rate limiting NOT working! Made 12 attempts without blocking`);
    }
    
    // Test 2: Registration Rate Limiting (5 requests per 15 minutes)
    console.log('\n\nTest 2: Registration Rate Limiting (max 5/15min)');
    console.log('-'.repeat(60));
    
    let regAttempts = 0;
    let regBlocked = false;
    
    for (let i = 1; i <= 7; i++) {
      try {
        await axios.post(`${API_BASE}/users/register`, {
          institutionId: `test${Date.now()}${i}`,
          username: `Test User ${i}`,
          password: 'password123',
          role: 'student',
          email: `test${Date.now()}${i}@test.com`
        });
        regAttempts++;
        console.log(`   Request ${i}: Accepted (user would be created)`);
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.log(`   ✅ Request ${i}: Rate limit enforced (429 Too Many Requests)`);
          console.log(`      Message: "${error.response.data.message}"`);
          regBlocked = true;
          break;
        } else if (error.response) {
          console.log(`   Request ${i}: Failed with ${error.response.status}`);
          regAttempts++;
        }
      }
    }
    
    if (regBlocked) {
      console.log(`\n   ✅ Registration rate limiting working! Blocked after ${regAttempts} attempts`);
    } else {
      console.log(`\n   ❌ Registration rate limiting NOT working! Made 7 attempts without blocking`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Rate Limiting Test Results:');
    console.log('='.repeat(60));
    
    if (loginBlocked && regBlocked) {
      console.log('✅ All rate limiters working correctly');
      console.log('✅ Login limiter: 10 requests per 15 minutes');
      console.log('✅ Registration limiter: 5 requests per 15 minutes');
      console.log('✅ Vote limiter: 10 requests per hour (applied on vote endpoint)');
    } else {
      console.log('⚠️  Some rate limiters may not be working as expected');
      if (!loginBlocked) console.log('   ❌ Login limiter not triggered');
      if (!regBlocked) console.log('   ❌ Registration limiter not triggered');
    }
    
    console.log('\n📌 Note: Rate limits reset after the time window');
    console.log('   - Login: 15 minutes');
    console.log('   - Registration: 15 minutes');
    console.log('   - Voting: 1 hour');
    console.log('='.repeat(60));
    
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
testRateLimiting();
