const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voting_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('  → MySQL server is not running or not reachable at', process.env.DB_HOST || 'localhost');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  → Invalid username or password');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('  → Database "' + (process.env.DB_NAME || 'voting_db') + '" does not exist');
    }
    throw error;
  }
}

// Export the pool and functions
module.exports = {
  pool,
  testConnection
};