const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

// Configuration
const BACKEND_PORT = 3000;
const BLOCKCHAIN_PORT = 3001;
const WAIT_TIME = 3000; // ms to wait for services to start

// Start backend server
function startBackend() {
  console.log('Starting backend server...');
  const backend = spawn('node', ['index.js'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit'
  });
  
  backend.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });
  
  return backend;
}

// Start blockchain node
function startBlockchainNode() {
  console.log('Starting blockchain node...');
  const node = spawn('node', ['index.js'], {
    cwd: path.join(__dirname, 'blockchain-node'),
    stdio: 'inherit'
  });
  
  node.on('error', (err) => {
    console.error('Failed to start blockchain node:', err);
  });
  
  return node;
}

// Test backend health
async function testBackendHealth() {
  try {
    const response = await axios.get(`http://localhost:${BACKEND_PORT}/health`);
    console.log('✅ Backend health check:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

// Test blockchain node status
async function testBlockchainNode() {
  try {
    const response = await axios.get(`http://localhost:${BLOCKCHAIN_PORT}/status`);
    console.log('✅ Blockchain node status:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Blockchain node connection failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== UNIVERSITY BLOCKCHAIN VOTING SYSTEM TEST ===');
  
  // Start services
  const backend = startBackend();
  const node = startBlockchainNode();
  
  // Wait for services to start
  console.log(`Waiting ${WAIT_TIME}ms for services to start...`);
  await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
  
  // Run tests
  const backendHealthy = await testBackendHealth();
  const blockchainConnected = await testBlockchainNode();
  
  // Report results
  console.log('\n=== TEST RESULTS ===');
  console.log(`Backend health: ${backendHealthy ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Blockchain connection: ${blockchainConnected ? '✅ PASS' : '❌ FAIL'}`);
  
  // Cleanup
  console.log('\nShutting down services...');
  backend.kill();
  node.kill();
  
  console.log('Tests completed');
}

// Run the tests
runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});