const { pool } = require('./config/db');

async function testConnection() {
  try {
    console.log('Testing MySQL connection...');
    const [rows] = await pool.query('SELECT 1 as test');
    console.log('✅ MySQL connection successful!');
    console.log('Test query result:', rows);
    
    // Test users table
    const [users] = await pool.query('SELECT id, username, institution_id FROM users LIMIT 1');
    console.log('✅ Users table accessible');
    console.log('Sample user:', users[0]);
    
    await pool.end();
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  }
}

testConnection();
