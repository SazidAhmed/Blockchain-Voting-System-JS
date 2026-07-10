/**
 * Database Migration for Admin Audit Logging
 * Run this to create necessary tables for admin activity tracking
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'voting'
    });

    console.log('Running Admin Audit Migration...\n');

    // Create admin_audit_logs table
    const createAuditLogsTable = `
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        admin_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id INT,
        changes LONGTEXT,
        change_hash VARCHAR(64),
        action_signature VARCHAR(64),
        reason VARCHAR(500),
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata JSON,
        timestamp DATETIME NOT NULL,
        status ENUM('success', 'failed') DEFAULT 'success',
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_action_type (action_type),
        INDEX idx_resource_type (resource_type),
        INDEX idx_timestamp (timestamp),
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createAuditLogsTable);
    console.log('✓ Created admin_audit_logs table');

    // Create admin_security_logs table
    const createSecurityLogsTable = `
      CREATE TABLE IF NOT EXISTS admin_security_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        admin_id INT NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        description VARCHAR(500),
        metadata JSON,
        timestamp DATETIME NOT NULL,
        acknowledged BOOLEAN DEFAULT FALSE,
        acknowledged_by INT,
        acknowledged_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_event_type (event_type),
        INDEX idx_severity (severity),
        INDEX idx_timestamp (timestamp),
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createSecurityLogsTable);
    console.log('✓ Created admin_security_logs table');

    // Add election_locked column to elections table if not exists
    const checkElectionColumn = `
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'elections' AND COLUMN_NAME = 'is_locked'
    `;

    const [columns] = await connection.query(checkElectionColumn);
    
    if (columns.length === 0) {
      const alterElectionsTable = `
        ALTER TABLE elections 
        ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
        ADD COLUMN locked_at DATETIME,
        ADD COLUMN locked_by INT,
        ADD FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL
      `;

      await connection.query(alterElectionsTable);
      console.log('✓ Added is_locked column to elections table');
    }

    // Add mutation_disabled column to candidates table if not exists
    const checkCandidateColumn = `
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'candidates' AND COLUMN_NAME = 'is_locked'
    `;

    const [candColumns] = await connection.query(checkCandidateColumn);
    
    if (candColumns.length === 0) {
      const alterCandidatesTable = `
        ALTER TABLE candidates 
        ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
        ADD COLUMN locked_at DATETIME
      `;

      await connection.query(alterCandidatesTable);
      console.log('✓ Added is_locked column to candidates table');
    }

    // Create admin_activity_log view
    const createActivityView = `
      CREATE OR REPLACE VIEW admin_activity_summary AS
      SELECT 
        u.id,
        u.username,
        u.email,
        COUNT(CASE WHEN aal.action_type = 'CREATE_ELECTION' THEN 1 END) as elections_created,
        COUNT(CASE WHEN aal.action_type = 'ADD_CANDIDATE' THEN 1 END) as candidates_added,
        COUNT(CASE WHEN aal.action_type = 'DELETE_CANDIDATE' THEN 1 END) as candidates_deleted,
        COUNT(CASE WHEN aal.action_type = 'ACTIVATE_ELECTION' THEN 1 END) as elections_activated,
        COUNT(CASE WHEN aal.action_type = 'DEACTIVATE_ELECTION' THEN 1 END) as elections_deactivated,
        COUNT(CASE WHEN aal.status = 'failed' THEN 1 END) as failed_actions,
        MAX(aal.timestamp) as last_action
      FROM users u
      LEFT JOIN admin_audit_logs aal ON u.id = aal.admin_id
      WHERE u.role = 'admin'
      GROUP BY u.id, u.username, u.email;
    `;

    await connection.query(createActivityView);
    console.log('✓ Created admin_activity_summary view');

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
runMigration();
