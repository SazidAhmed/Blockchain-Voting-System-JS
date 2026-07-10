// Test blockchain node connectivity
const axios = require('axios');

const BLOCKCHAIN_URL = 'http://localhost:3001';

async function testBlockchainNode() {
    console.log('Testing blockchain node connectivity...\n');
    
    try {
        // Test 1: Get node info
        console.log('Test 1: GET /node');
        const nodeResponse = await axios.get(`${BLOCKCHAIN_URL}/node`, {
            timeout: 5000
        });
        console.log('✓ Node info:', nodeResponse.data);
        
        // Test 2: Get blockchain
        console.log('\nTest 2: GET /chain');
        const chainResponse = await axios.get(`${BLOCKCHAIN_URL}/chain`, {
            timeout: 5000
        });
        console.log('✓ Chain length:', chainResponse.data.length);
        console.log('  First block:', chainResponse.data.chain[0]);
        
        // Test 3: Submit a test vote
        console.log('\nTest 3: POST /vote');
        const testVote = {
            voterId: 1,
            electionId: 1,
            encryptedBallot: 'test_encrypted_ballot_data',
            nullifier: 'a'.repeat(64), // 64 character hex string
            signature: 'test_signature',
            publicKey: 'test_public_key',
            timestamp: Date.now()
        };
        
        const voteResponse = await axios.post(`${BLOCKCHAIN_URL}/vote`, testVote, {
            timeout: 5000
        });
        console.log('✓ Vote submitted:', voteResponse.data);
        
        // Test 4: Check nullifier
        console.log('\nTest 4: GET /nullifier/:nullifier');
        const nullifierResponse = await axios.get(`${BLOCKCHAIN_URL}/nullifier/${testVote.nullifier}`, {
            timeout: 5000
        });
        console.log('✓ Nullifier status:', nullifierResponse.data);
        
        // Test 5: Mine a block
        console.log('\nTest 5: GET /mine');
        const mineResponse = await axios.get(`${BLOCKCHAIN_URL}/mine`, {
            timeout: 10000
        });
        console.log('✓ Block mined:', mineResponse.data.message);
        console.log('  Block index:', mineResponse.data.block.index);
        
        // Test 6: Get updated chain
        console.log('\nTest 6: GET /chain (after mining)');
        const chainResponse2 = await axios.get(`${BLOCKCHAIN_URL}/chain`, {
            timeout: 5000
        });
        console.log('✓ New chain length:', chainResponse2.data.length);
        
        console.log('\n========================================');
        console.log('All tests passed! Blockchain node is working correctly.');
        console.log('========================================');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('  → Blockchain node is not running or not accessible');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('  → Request timed out');
        } else if (error.response) {
            console.error('  → HTTP', error.response.status, error.response.data);
        }
        process.exit(1);
    }
}

testBlockchainNode();
