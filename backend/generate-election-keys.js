const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

// Create keys directory if it doesn't exist
const KEYS_DIR = path.join(__dirname, 'keys');
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  console.log('📁 Created keys directory');
}

async function generateElectionKeys(electionId) {
  console.log(`\n🔐 Generating RSA-OAEP 2048-bit keypair for election ${electionId}...`);
  
  // Generate RSA keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  console.log('✅ Keypair generated');
  console.log(`   Public key length: ${publicKey.length} characters`);
  console.log(`   Private key length: ${privateKey.length} characters`);
  
  // Save private key to file (for decryption of ballots later)
  const privateKeyPath = path.join(KEYS_DIR, `election_${electionId}_private.pem`);
  fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
  console.log(`   💾 Private key saved to: ${privateKeyPath}`);
  
  // Save public key to file (for reference)
  const publicKeyPath = path.join(KEYS_DIR, `election_${electionId}_public.pem`);
  fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
  console.log(`   💾 Public key saved to: ${publicKeyPath}`);
  
  // Update database with public key
  await pool.query(
    'UPDATE elections SET public_key = ? WHERE id = ?',
    [publicKey, electionId]
  );
  console.log('   📝 Public key updated in database');
  
  // Test encryption/decryption
  console.log('\n🧪 Testing encryption/decryption...');
  const testData = JSON.stringify({ candidateId: 1, timestamp: Date.now() });
  
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(testData)
  );
  
  console.log(`   ✅ Encrypted test ballot (${encrypted.length} bytes)`);
  
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    encrypted
  );
  
  const decryptedData = decrypted.toString();
  console.log(`   ✅ Decrypted successfully: ${decryptedData}`);
  
  if (decryptedData === testData) {
    console.log('   ✅ Encryption/decryption test PASSED');
  } else {
    console.log('   ❌ Encryption/decryption test FAILED');
  }
  
  return { publicKey, privateKey, publicKeyPath, privateKeyPath };
}

async function generateKeysForAllElections() {
  console.log('🔑 RSA Election Key Generator');
  console.log('=' .repeat(60));
  
  try {
    // Get all elections
    const [elections] = await pool.query(
      'SELECT id, title, status FROM elections ORDER BY id'
    );
    
    console.log(`\nFound ${elections.length} elections:\n`);
    elections.forEach(e => {
      console.log(`   ${e.id}. ${e.title} (${e.status})`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    // Generate keys for each election
    for (const election of elections) {
      await generateElectionKeys(election.id);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All election keys generated successfully!');
    console.log('=' .repeat(60));
    console.log('\n📌 Important Notes:');
    console.log('   1. Private keys are stored in backend/keys/ directory');
    console.log('   2. Add backend/keys/*.pem to .gitignore');
    console.log('   3. NEVER commit private keys to version control');
    console.log('   4. Public keys are stored in the elections table');
    console.log('   5. Voters will use public keys to encrypt their ballots');
    console.log('   6. Only election administrators can decrypt using private keys');
    console.log('\n' + '='.repeat(60));
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error generating keys:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateKeysForAllElections();
}

module.exports = { generateElectionKeys };
