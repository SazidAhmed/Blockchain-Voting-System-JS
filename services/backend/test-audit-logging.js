const axios = require('axios');
const { pool } = require('./config/db');
const auditLogger = require('./utils/auditLogger');

const API_BASE = 'http://localhost:3000/api';

async function testAuditLogging() {
  console.log('📋 Testing Audit Logging System\n');
  console.log('='.repeat(60));
  
  try {
    // Clear previous test audit logs
    await pool.query('DELETE FROM audit_logs WHERE event_type LIKE ?', ['%TEST%']);
    console.log('✅ Cleared previous test logs\n');
    
    // Test 1: Direct audit logger test
    console.log('Test 1: Direct Audit Logger');
    console.log('-'.repeat(60));
    
    const testLog = await auditLogger.log({
      type: 'TEST_EVENT',
      category: 'security',
      userId: 1,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
      targetType: 'test',
      targetId: '123',
      details: { test: 'direct logger test' },
      severity: 'info'
    });
    
    console.log('✅ Direct log result:', testLog.success ? 'SUCCESS' : 'FAILED');
    if (testLog.logHash) {
      console.log(`   Log hash: ${testLog.logHash.substring(0, 16)}...`);
    }
    
    // Test 2: Failed login (should trigger audit log)
    console.log('\n\nTest 2: Failed Login Attempt');
    console.log('-'.repeat(60));
    
    try {
      await axios.post(`${API_BASE}/users/login`, {
        institutionId: 'nonexistent',
        password: 'wrongpassword'
      });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Login failed as expected (400)');
      }
    }
    
    // Check if audit log was created
    const [failedLoginLogs] = await pool.query(
      'SELECT * FROM audit_logs WHERE event_type = ? ORDER BY timestamp DESC LIMIT 1',
      ['LOGIN_FAILED']
    );
    
    if (failedLoginLogs.length > 0) {
      console.log('✅ Audit log created for failed login');
      console.log(`   Event: ${failedLoginLogs[0].event_type}`);
      console.log(`   Severity: ${failedLoginLogs[0].severity}`);
      console.log(`   IP: ${failedLoginLogs[0].ip_address}`);
    } else {
      console.log('❌ No audit log found for failed login');
    }
    
    // Test 3: Successful login (should trigger audit log)
    console.log('\n\nTest 3: Successful Login');
    console.log('-'.repeat(60));
    
    const loginResponse = await axios.post(`${API_BASE}/users/login`, {
      institutionId: '12345',
      password: 'password'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.token;
    
    // Check if audit log was created
    const [successLoginLogs] = await pool.query(
      'SELECT * FROM audit_logs WHERE event_type = ? AND user_id = ? ORDER BY timestamp DESC LIMIT 1',
      ['USER_LOGIN', loginResponse.data.user.id]
    );
    
    if (successLoginLogs.length > 0) {
      console.log('✅ Audit log created for successful login');
      console.log(`   User ID: ${successLoginLogs[0].user_id}`);
      console.log(`   Severity: ${successLoginLogs[0].severity}`);
    } else {
      console.log('❌ No audit log found for successful login');
    }
    
    // Test 4: Vote attempt (should trigger multiple audit logs)
    console.log('\n\nTest 4: Vote Submission');
    console.log('-'.repeat(60));
    
    // Reset vote status for testing
    await pool.query('UPDATE voter_registrations SET status = ? WHERE user_id = ? AND election_id = ?', 
      ['registered', loginResponse.data.user.id, 4]);
    await pool.query('DELETE FROM votes_meta WHERE election_id = ?', [4]);
    
    try {
      await axios.post(
        `${API_BASE}/elections/4/vote`,
        {
          encryptedBallot: Buffer.from('test').toString('base64'),
          nullifier: require('crypto').randomBytes(32).toString('hex'),
          signature: require('crypto').randomBytes(64).toString('base64'),
          publicKey: Buffer.from(JSON.stringify({kty:'EC',crv:'P-256',x:'test',y:'test'})).toString('base64'),
          timestamp: Date.now()
        },
        { headers: { 'x-auth-token': token } }
      );
    } catch (error) {
      // Expected to fail (invalid signature), but should log
      console.log(`   Vote failed: ${error.response?.data?.message || error.message}`);
    }
    
    // Check for signature verification log
    const [sigLogs] = await pool.query(
      'SELECT * FROM audit_logs WHERE event_type LIKE ? ORDER BY timestamp DESC LIMIT 1',
      ['SIGNATURE_%']
    );
    
    if (sigLogs.length > 0) {
      console.log('✅ Audit log created for signature verification');
      console.log(`   Event: ${sigLogs[0].event_type}`);
      console.log(`   Result: ${sigLogs[0].event_type.includes('FAILED') ? 'FAILED' : 'PASSED'}`);
    } else {
      console.log('❌ No audit log found for signature verification');
    }
    
    // Test 5: Check audit log integrity
    console.log('\n\nTest 5: Audit Log Chain Integrity');
    console.log('-'.repeat(60));
    
    const integrityCheck = await auditLogger.verifyIntegrity(10);
    
    if (integrityCheck.valid) {
      console.log('✅ Audit log chain is valid');
      console.log(`   Checked ${integrityCheck.results.length} logs`);
    } else {
      console.log('❌ Audit log chain integrity check failed');
      if (integrityCheck.error) {
        console.log(`   Error: ${integrityCheck.error}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Audit Logging Summary');
    console.log('='.repeat(60));
    
    const [totalLogs] = await pool.query('SELECT COUNT(*) as count FROM audit_logs');
    const [recentLogs] = await pool.query(
      'SELECT event_type, COUNT(*) as count FROM audit_logs GROUP BY event_type ORDER BY count DESC LIMIT 10'
    );
    
    console.log(`Total audit logs: ${totalLogs[0].count}`);
    console.log('\nTop event types:');
    recentLogs.forEach(log => {
      console.log(`   ${log.event_type}: ${log.count}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Audit Logging Test Complete!');
    console.log('='.repeat(60));
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testAuditLogging();
