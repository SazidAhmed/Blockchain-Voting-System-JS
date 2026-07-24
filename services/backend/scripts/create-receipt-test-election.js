const { pool } = require('../config/db');

async function createTestElection() {
  try {
    // Create a new election
    const [electionResult] = await pool.query(`
      INSERT INTO elections (title, description, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'Receipt UI Test Election',
      'Testing vote receipt display and functionality',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      'active'
    ]);
    
    const electionId = electionResult.insertId;
    console.log(`✅ Created election ID: ${electionId}`);
    
    // Add candidates
    const candidates = [
      { name: 'Option A', description: 'First test option' },
      { name: 'Option B', description: 'Second test option' },
      { name: 'Option C', description: 'Third test option' }
    ];
    
    for (const candidate of candidates) {
      const [result] = await pool.query(`
        INSERT INTO candidates (election_id, name, description)
        VALUES (?, ?, ?)
      `, [electionId, candidate.name, candidate.description]);
      console.log(`✅ Added candidate: ${candidate.name} (ID: ${result.insertId})`);
    }
    
    // Register existing users for this election
    const [users] = await pool.query(`
      SELECT id, username FROM users WHERE public_key IS NOT NULL
    `);
    
    for (const user of users) {
      await pool.query(`
        INSERT INTO voter_registrations (user_id, election_id, status)
        VALUES (?, ?, 'registered')
      `, [user.id, electionId]);
      console.log(`✅ Registered user: ${user.username}`);
    }
    
    console.log(`\n🎉 Test election created successfully!`);
    console.log(`Election ID: ${electionId}`);
    const feUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.log(`Navigate to: ${feUrl}/elections/${electionId}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTestElection();
