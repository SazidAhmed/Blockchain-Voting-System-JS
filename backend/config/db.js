const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voting',
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
    console.error('Database connection error:', error);
    throw error;
  }
}

// For development purposes, we'll create a function to initialize the database
async function initializeDatabase() {
  try {
    // Create connection without database selected
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'voting'}`);
    
    // Use the database
    await connection.query(`USE ${process.env.DB_NAME || 'voting'}`);
    
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        institution_id VARCHAR(50) UNIQUE NOT NULL,
        username VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'teacher', 'staff', 'board_member') NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        public_key TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create elections table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS elections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
        created_by INT,
        public_key TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    // Create candidates table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        election_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (election_id) REFERENCES elections(id)
      )
    `);
    
    // Create voter_registrations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS voter_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        election_id INT NOT NULL,
        registration_token VARCHAR(255) UNIQUE,
        status ENUM('registered', 'voted', 'revoked') DEFAULT 'registered',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (user_id, election_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (election_id) REFERENCES elections(id)
      )
    `);

    // Create vote_receipts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vote_receipts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        election_id INT NOT NULL,
        nullifier_hash VARCHAR(64) NOT NULL,
        transaction_hash VARCHAR(64) NOT NULL,
        block_height INT,
        block_hash VARCHAR(64),
        merkle_proof JSON,
        validator_signatures JSON,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (election_id) REFERENCES elections(id),
        INDEX idx_election_id (election_id),
        INDEX idx_nullifier_hash (nullifier_hash),
        INDEX idx_transaction_hash (transaction_hash)
      )
    `);
    
    console.log('Database initialized successfully');
    console.log('Note: For full schema with all tables, run: node migrate.js');
    await connection.end();
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export the pool and functions
module.exports = {
  pool,
  testConnection,
  initializeDatabase
};