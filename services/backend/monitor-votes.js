const { pool } = require('./config/db');

let lastVoteCount = 0;

async function monitorVotes() {
  try {
    // Get current vote count
    const [countResult] = await pool.query('SELECT COUNT(*) as count FROM votes_meta');
    const currentCount = countResult[0].count;
    
    if (currentCount > lastVoteCount) {
      console.log('\n🎉 NEW VOTE DETECTED!');
      console.log('='.repeat(60));
      
      // Get the latest vote
      const [votes] = await pool.query(`
        SELECT 
          id,
          election_id,
          nullifier_hash,
          LEFT(encrypted_ballot, 60) as ballot_preview,
          LEFT(signature, 40) as signature_preview,
          LEFT(voter_public_key, 40) as pubkey_preview,
          tx_hash,
          block_index,
          timestamp
        FROM votes_meta
        ORDER BY id DESC
        LIMIT 1
      `);
      
      if (votes.length > 0) {
        const vote = votes[0];
        console.log(`Vote ID: ${vote.id}`);
        console.log(`Election: ${vote.election_id}`);
        console.log(`Transaction: ${vote.tx_hash.substring(0, 20)}...`);
        console.log(`Nullifier: ${vote.nullifier_hash.substring(0, 20)}...`);
        console.log(`Encrypted Ballot: ${vote.ballot_preview}...`);
        console.log(`Signature: ${vote.signature_preview ? vote.signature_preview + '...' : 'NULL'}`);
        console.log(`Public Key: ${vote.pubkey_preview ? vote.pubkey_preview + '...' : 'NULL'}`);
        console.log(`Timestamp: ${vote.timestamp}`);
        console.log('='.repeat(60));
        
        // Check if it has crypto fields
        const [fullVote] = await pool.query(
          'SELECT signature, voter_public_key FROM votes_meta WHERE id = ?',
          [vote.id]
        );
        
        if (fullVote[0].signature && fullVote[0].voter_public_key) {
          console.log('✅ CRYPTO VOTE - Has signature and public key!');
          console.log('✅ CLIENT-SIDE ENCRYPTION WORKING!');
        } else {
          console.log('⚠️  LEGACY VOTE - No crypto fields');
        }
        console.log('');
      }
      
      lastVoteCount = currentCount;
    }
    
    // Show monitoring status every 5 seconds
    if (Date.now() % 5000 < 2000) {
      console.log(`[${new Date().toLocaleTimeString()}] Monitoring... Total votes: ${currentCount}`);
    }
    
  } catch (error) {
    console.error('Error monitoring votes:', error.message);
  }
}

console.log('\n🔍 VOTE MONITOR STARTED');
console.log('Watching for encrypted votes...');
console.log('Press Ctrl+C to stop\n');

// Check every 2 seconds
setInterval(monitorVotes, 2000);

// Initial check
monitorVotes();
