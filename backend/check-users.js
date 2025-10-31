const { pool } = require('./config/db');

async function checkUsers() {
  try {
    console.log('Connecting to database...');
    const [users] = await pool.execute(
      'SELECT id as user_id, username, institution_id, created_at FROM users ORDER BY id'
    );
    
    console.log('\n=== Existing Test Users ===');
    if (users.length === 0) {
      console.log('No users found in database.');
      console.log('\nYou can register new users through the frontend at http://localhost:5173/register');
    } else {
      users.forEach(user => {
        console.log(`User ID: ${user.user_id}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Institution ID: ${user.institution_id}`);
        console.log(`  Created: ${user.created_at}`);
        console.log('---');
      });
    }
    
    const [elections] = await pool.execute('SELECT id as election_id, title, status FROM elections');
    console.log('\n=== Elections ===');
    if (elections.length === 0) {
      console.log('No elections found.');
    } else {
      elections.forEach(election => {
        console.log(`${election.election_id}: ${election.title} (${election.status})`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
