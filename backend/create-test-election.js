const { pool } = require('./config/db');

async function createTestElection() {
  try {
    console.log('Creating test election...\n');
    
    // Create election
    const [electionResult] = await pool.query(`
      INSERT INTO elections 
      (title, description, start_date, end_date, status, created_by, public_key) 
      VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), ?, 1, ?)
    `, [
      'Crypto Test Election',
      'Testing encrypted voting system with client-side cryptography',
      'active',
      'test_election_key_' + Date.now()
    ]);
    
    const electionId = electionResult.insertId;
    console.log(`✓ Election created with ID: ${electionId}`);
    
    // Create candidates
    await pool.query(`
      INSERT INTO candidates (election_id, name, description) VALUES
      (?, 'Alice Johnson', 'Candidate A - Tech Innovation & Digital Rights'),
      (?, 'Bob Smith', 'Candidate B - Student Welfare & Campus Life'),
      (?, 'Carol Williams', 'Candidate C - Campus Security & Sustainability')
    `, [electionId, electionId, electionId]);
    
    console.log('✓ Candidates created:');
    console.log('  - Alice Johnson');
    console.log('  - Bob Smith');
    console.log('  - Carol Williams');
    
    // Get all users to register them
    const [users] = await pool.query('SELECT id, username FROM users');
    
    if (users.length > 0) {
      console.log(`\n✓ Registering ${users.length} user(s) for the election...`);
      
      for (const user of users) {
        try {
          await pool.query(`
            INSERT INTO voter_registrations (user_id, election_id, status)
            VALUES (?, ?, 'registered')
          `, [user.id, electionId]);
          console.log(`  ✓ Registered user: ${user.username} (ID: ${user.id})`);
        } catch (error) {
          // User might already be registered
          if (error.code !== 'ER_DUP_ENTRY') {
            throw error;
          }
        }
      }
    } else {
      console.log('\n⚠️  No users found. Please register a user first!');
    }
    
    console.log(`\n🎉 Test election ready!`);
    console.log(`   Election ID: ${electionId}`);
    console.log(`   Title: Crypto Test Election`);
    console.log(`   Status: active`);
    console.log(`   Candidates: 3`);
    console.log(`\n✅ You can now vote at: http://localhost:5174/#/elections`);
    
    await pool.end();
  } catch (error) {
    console.error('\n❌ Error creating test election:', error.message);
    process.exit(1);
  }
}

createTestElection();
