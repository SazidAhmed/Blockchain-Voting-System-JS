const { pool } = require('./config/db');

async function checkElections() {
  try {
    const [elections] = await pool.query(`
      SELECT id, title, status, created_at 
      FROM elections 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log('\n=== Recent Elections ===');
    elections.forEach(e => {
      console.log(`ID: ${e.id} | Title: ${e.title} | Status: ${e.status}`);
    });
    
    const [voters] = await pool.query(`
      SELECT u.id, u.username, u.institution_id 
      FROM users u 
      WHERE u.public_key IS NOT NULL 
      ORDER BY u.id DESC 
      LIMIT 5
    `);
    
    console.log('\n=== Users with Crypto Keys ===');
    voters.forEach(v => {
      console.log(`ID: ${v.id} | Username: ${v.username} | Institution ID: ${v.institution_id}`);
    });
    
    const [votes] = await pool.query(`
      SELECT id, election_id, LEFT(nullifier_hash, 16) as nullifier 
      FROM votes_meta 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log('\n=== Recent Votes ===');
    votes.forEach(v => {
      console.log(`Vote ID: ${v.id} | Election: ${v.election_id} | Nullifier: ${v.nullifier}...`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkElections();
