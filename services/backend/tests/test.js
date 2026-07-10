const axios = require('axios');

// Test backend connectivity
async function testBackendHealth() {
  try {
    const response = await axios.get('http://localhost:3000/health');
    console.log('Backend health check:', response.data);
    return response.data.status === 'ok';
  } catch (error) {
    console.error('Backend health check failed:', error.message);
    return false;
  }
}

// Test blockchain node connectivity
async function testBlockchainNode() {
  try {
    const response = await axios.get('http://localhost:3001/status');
    console.log('Blockchain node status:', response.data);
    return true;
  } catch (error) {
    console.error('Blockchain node connection failed:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('Starting system tests...');
  
  const backendHealthy = await testBackendHealth();
  console.log('Backend health:', backendHealthy ? 'PASS' : 'FAIL');
  
  const blockchainConnected = await testBlockchainNode();
  console.log('Blockchain connection:', blockchainConnected ? 'PASS' : 'FAIL');
  
  console.log('Tests completed');
}

runTests();