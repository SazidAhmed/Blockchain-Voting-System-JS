/**
 * Merkle Tree Implementation Test
 * 
 * This script tests the Merkle tree functionality including:
 * - Tree construction
 * - Root hash calculation
 * - Proof generation
 * - Proof verification
 * - Integration with blockchain
 */

const { MerkleTree, MerkleTreeUtils } = require('./merkleTree');

console.log('='.repeat(70));
console.log('MERKLE TREE IMPLEMENTATION TEST');
console.log('='.repeat(70));
console.log();

// Test data - simulating vote transactions
const testVotes = [
    {
        transactionHash: '7b3782b526974c0f580e4f958b4998b2f446b323d0827e0dd52f70b723c6e5fb',
        nullifier: '84ca53964d72f41fa790ea42909803299727ef37ce621d0c29b1b7b656769383',
        electionId: '1',
        timestamp: 1763026068827
    },
    {
        transactionHash: '8de69bbecfc6994c135fcc9e16da7fcca061b0a928acc91b921fc93b3da90a0d',
        nullifier: 'e27ded9c1d5fc0ebc6292bdd6a604fe3c2904dbb4a968071f2cb80f89621cb75',
        electionId: '1',
        timestamp: 1763026373792
    },
    {
        transactionHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
        nullifier: 'f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3',
        electionId: '1',
        timestamp: 1763027000000
    },
    {
        transactionHash: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3',
        nullifier: 'g2f3e4d5c6b7a899887968778695a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7',
        electionId: '1',
        timestamp: 1763027100000
    }
];

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        console.log(`\n📝 Test: ${name}`);
        fn();
        console.log('   ✅ PASSED');
        testsPassed++;
    } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        testsFailed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

// ==================== TEST 1: Tree Construction ====================
test('Tree Construction from Votes', () => {
    const tree = MerkleTree.fromVotes(testVotes);
    
    assert(tree !== null, 'Tree should not be null');
    assert(tree.leaves.length === testVotes.length, 
        `Expected ${testVotes.length} leaves, got ${tree.leaves.length}`);
    assert(tree.getRoot() !== null, 'Root should not be null');
    
    console.log(`   📊 Leaves: ${tree.leaves.length}`);
    console.log(`   🌳 Root: ${tree.getRoot().substring(0, 16)}...`);
    console.log(`   📏 Depth: ${tree.getDepth()}`);
});

// ==================== TEST 2: Root Hash Calculation ====================
test('Root Hash Calculation', () => {
    const tree = MerkleTree.fromVotes(testVotes);
    const root1 = tree.getRoot();
    
    // Create another tree with same data
    const tree2 = MerkleTree.fromVotes(testVotes);
    const root2 = tree2.getRoot();
    
    assert(root1 === root2, 'Same data should produce same root hash');
    assert(root1.length === 64, `Root should be 64 chars (SHA-256), got ${root1.length}`);
    
    console.log(`   🔑 Root 1: ${root1.substring(0, 32)}...`);
    console.log(`   🔑 Root 2: ${root2.substring(0, 32)}...`);
    console.log(`   ✔️ Deterministic: ${root1 === root2}`);
});

// ==================== TEST 3: Proof Generation ====================
test('Proof Generation for First Vote', () => {
    const tree = MerkleTree.fromVotes(testVotes);
    const firstVote = testVotes[0];
    
    const proof = tree.getProof(firstVote);
    
    assert(proof !== null, 'Proof should not be null');
    assert(proof.leaf !== undefined, 'Proof should have leaf hash');
    assert(proof.path !== undefined, 'Proof should have path');
    assert(proof.root !== undefined, 'Proof should have root');
    assert(Array.isArray(proof.path), 'Path should be an array');
    
    console.log(`   📜 Proof generated for vote: ${firstVote.transactionHash.substring(0, 16)}...`);
    console.log(`   📍 Leaf: ${proof.leaf.substring(0, 16)}...`);
    console.log(`   🛤️  Path length: ${proof.path.length} hashes`);
    console.log(`   🌳 Root: ${proof.root.substring(0, 16)}...`);
});

// ==================== TEST 4: Proof Verification ====================
test('Proof Verification - Valid Proof', () => {
    const tree = MerkleTree.fromVotes(testVotes);
    const voteToVerify = testVotes[1]; // Second vote
    
    const proof = tree.getProof(voteToVerify);
    const isValid = tree.verifyProof(voteToVerify, proof);
    
    assert(isValid === true, 'Valid proof should be verified as true');
    
    console.log(`   ✅ Vote verified: ${voteToVerify.transactionHash.substring(0, 16)}...`);
    console.log(`   🔐 Proof is valid: ${isValid}`);
});

// ==================== TEST 5: Invalid Proof Detection ====================
test('Invalid Proof Detection', () => {
    const tree = MerkleTree.fromVotes(testVotes);
    const validVote = testVotes[0];
    
    // Get valid proof
    const validProof = tree.getProof(validVote);
    
    // Tamper with the vote data
    const tamperedVote = { ...validVote, timestamp: 9999999999 };
    
    // Try to verify tampered vote with valid proof
    const isValid = tree.verifyProof(tamperedVote, validProof);
    
    assert(isValid === false, 'Tampered vote should not be verified');
    
    console.log(`   🚫 Tampered vote rejected: ${isValid}`);
});

// ==================== TEST 6: All Votes Verification ====================
test('Verify All Votes in Tree', () => {
    const tree = MerkleTree.fromVotes(testVotes);
    let allValid = true;
    
    for (let i = 0; i < testVotes.length; i++) {
        const vote = testVotes[i];
        const proof = tree.getProof(vote);
        const isValid = tree.verifyProof(vote, proof);
        
        if (!isValid) {
            allValid = false;
            console.log(`   ❌ Vote ${i} verification failed`);
        }
    }
    
    assert(allValid === true, 'All votes should be verified successfully');
    
    console.log(`   ✅ All ${testVotes.length} votes verified successfully`);
});

// ==================== TEST 7: Tree Statistics ====================
test('Tree Statistics', () => {
    const tree = MerkleTree.fromVotes(testVotes);
    const stats = tree.getStats();
    
    assert(stats.leafCount === testVotes.length, 'Leaf count should match vote count');
    assert(stats.root !== null, 'Root should be present in stats');
    assert(stats.depth >= 0, 'Depth should be non-negative');
    assert(stats.proofSize > 0, 'Proof size should be positive');
    
    console.log(`   📊 Leaf Count: ${stats.leafCount}`);
    console.log(`   📏 Tree Depth: ${stats.depth}`);
    console.log(`   📐 Proof Size: ${stats.proofSize} hashes`);
    console.log(`   🌳 Root: ${stats.root.substring(0, 32)}...`);
});

// ==================== TEST 8: Proof Size Efficiency ====================
test('Proof Size Efficiency', () => {
    const tree = MerkleTree.fromVotes(testVotes);
    const stats = tree.getStats();
    
    // Full data size vs proof size
    const fullDataSize = testVotes.length * 64; // Assume 64 bytes per hash
    const proofSize = stats.proofSize * 64;
    const efficiency = ((fullDataSize - proofSize) / fullDataSize * 100).toFixed(2);
    
    console.log(`   📦 Full data size: ${fullDataSize} bytes`);
    console.log(`   📋 Single proof size: ${proofSize} bytes`);
    console.log(`   💾 Space savings: ${efficiency}%`);
    console.log(`   ⚡ Efficiency ratio: ${(fullDataSize / proofSize).toFixed(2)}x`);
    
    assert(proofSize < fullDataSize, 'Proof should be smaller than full data');
});

// ==================== TEST 9: Serialization ====================
test('Tree Serialization and Storage', () => {
    const tree = MerkleTree.fromVotes(testVotes);
    const serialized = tree.toJSON();
    
    assert(serialized.root !== undefined, 'Serialized tree should have root');
    assert(serialized.leaves !== undefined, 'Serialized tree should have leaves');
    assert(serialized.leafCount === testVotes.length, 'Leaf count should match');
    assert(serialized.depth === tree.getDepth(), 'Depth should match');
    assert(serialized.timestamp !== undefined, 'Should have timestamp');
    
    console.log(`   💾 Serialized tree:`);
    console.log(`      Root: ${serialized.root.substring(0, 32)}...`);
    console.log(`      Leaves: ${serialized.leafCount}`);
    console.log(`      Depth: ${serialized.depth}`);
    console.log(`      Timestamp: ${new Date(serialized.timestamp).toISOString()}`);
});

// ==================== TEST 10: Vote Not in Tree ====================
test('Proof Generation for Non-existent Vote', () => {
    const tree = MerkleTree.fromVotes(testVotes);
    
    const fakeVote = {
        transactionHash: 'fakehash123456789',
        nullifier: 'fakenullifier123',
        electionId: '1',
        timestamp: 9999999999
    };
    
    const proof = tree.getProof(fakeVote);
    
    assert(proof === null, 'Proof for non-existent vote should be null');
    
    console.log(`   ✅ Correctly returned null for non-existent vote`);
});

// ==================== TEST 11: Different Election Trees ====================
test('Separate Trees for Different Elections', () => {
    // Create votes for election 2
    const election2Votes = testVotes.map(vote => ({
        ...vote,
        electionId: '2'
    }));
    
    const tree1 = MerkleTree.fromVotes(testVotes);
    const tree2 = MerkleTree.fromVotes(election2Votes);
    
    const root1 = tree1.getRoot();
    const root2 = tree2.getRoot();
    
    assert(root1 !== root2, 'Different elections should have different roots');
    
    console.log(`   🌳 Election 1 Root: ${root1.substring(0, 32)}...`);
    console.log(`   🌳 Election 2 Root: ${root2.substring(0, 32)}...`);
    console.log(`   ✔️ Roots are different: ${root1 !== root2}`);
});

// ==================== TEST 12: Single Vote Tree ====================
test('Tree with Single Vote', () => {
    const singleVote = [testVotes[0]];
    const tree = MerkleTree.fromVotes(singleVote);
    
    assert(tree.leaves.length === 1, 'Should have 1 leaf');
    assert(tree.getDepth() === 0, 'Single node tree should have depth 0');
    
    const proof = tree.getProof(singleVote[0]);
    const isValid = tree.verifyProof(singleVote[0], proof);
    
    assert(isValid === true, 'Single vote should be verifiable');
    
    console.log(`   🌳 Single vote tree created`);
    console.log(`   📏 Depth: ${tree.getDepth()}`);
    console.log(`   ✅ Verification: ${isValid}`);
});

// ==================== TEST 13: Large Tree Performance ====================
test('Large Tree Performance (100 votes)', () => {
    const startTime = Date.now();
    
    // Generate 100 fake votes
    const largeVoteSet = [];
    for (let i = 0; i < 100; i++) {
        largeVoteSet.push({
            transactionHash: `hash_${i}_${'0'.repeat(56)}`,
            nullifier: `nullifier_${i}_${'0'.repeat(50)}`,
            electionId: '1',
            timestamp: Date.now() + i
        });
    }
    
    const tree = MerkleTree.fromVotes(largeVoteSet);
    const constructionTime = Date.now() - startTime;
    
    const stats = tree.getStats();
    
    // Test proof generation and verification
    const proofStartTime = Date.now();
    const randomVote = largeVoteSet[42];
    const proof = tree.getProof(randomVote);
    const isValid = tree.verifyProof(randomVote, proof);
    const proofTime = Date.now() - proofStartTime;
    
    assert(tree.leaves.length === 100, 'Should have 100 leaves');
    assert(isValid === true, 'Proof should be valid');
    
    console.log(`   📊 Tree size: ${largeVoteSet.length} votes`);
    console.log(`   📏 Tree depth: ${stats.depth}`);
    console.log(`   ⏱️  Construction time: ${constructionTime}ms`);
    console.log(`   ⚡ Proof gen + verification: ${proofTime}ms`);
    console.log(`   📐 Proof size: ${stats.proofSize} hashes (${stats.proofSize * 64} bytes)`);
});

// ==================== SUMMARY ====================
console.log('\n' + '='.repeat(70));
console.log('TEST SUMMARY');
console.log('='.repeat(70));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📊 Total Tests: ${testsPassed + testsFailed}`);
console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2)}%`);
console.log('='.repeat(70));

if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Merkle tree implementation is working correctly.\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the implementation.\n`);
    process.exit(1);
}
