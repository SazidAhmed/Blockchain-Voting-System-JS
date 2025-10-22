/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, 'migrations');
    this.connection = null;
  }

  /**
   * Connect to database
   */
  async connect() {
    // First connect without database to create it if needed
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true // Allow multiple SQL statements
    };

    this.connection = await mysql.createConnection(config);
    
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'voting';
    await this.connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await this.connection.query(`USE ${dbName}`);
    
    console.log(`✓ Connected to database: ${dbName}`);
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('✓ Disconnected from database');
    }
  }

  /**
   * Get list of migration files
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(f => f.endsWith('.sql'))
        .sort(); // Ensures migrations run in order
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`✗ Migrations directory not found: ${this.migrationsDir}`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if migration has already been applied
   */
  async isMigrationApplied(migrationName) {
    try {
      const [rows] = await this.connection.query(
        'SELECT id FROM schema_migrations WHERE migration_name = ?',
        [migrationName]
      );
      return rows.length > 0;
    } catch (error) {
      // If schema_migrations table doesn't exist, no migrations have been applied
      return false;
    }
  }

  /**
   * Record that a migration has been applied
   */
  async recordMigration(migrationName, checksum) {
    // Ensure schema_migrations table exists
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) COMMENT 'SHA256 of migration file'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.connection.query(
      'INSERT INTO schema_migrations (migration_name, checksum) VALUES (?, ?)',
      [migrationName, checksum]
    );
  }

  /**
   * Calculate checksum of migration file
   */
  async calculateChecksum(filePath) {
    const crypto = require('crypto');
    const content = await fs.readFile(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Run a single migration file
   */
  async runMigration(filename) {
    const migrationPath = path.join(this.migrationsDir, filename);
    const migrationName = filename.replace('.sql', '');

    console.log(`\n→ Running migration: ${migrationName}`);

    try {
      // Check if already applied
      if (await this.isMigrationApplied(migrationName)) {
        console.log(`  ⊙ Already applied, skipping`);
        return { status: 'skipped', name: migrationName };
      }

      // Read migration file
      const sql = await fs.readFile(migrationPath, 'utf8');
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(migrationPath);

      // Execute migration
      await this.connection.query(sql);
      
      // Record migration (the migration file itself creates schema_migrations table)
      if (!migrationName.includes('initial_schema')) {
        await this.recordMigration(migrationName, checksum);
      }
      
      console.log(`  ✓ Successfully applied`);
      return { status: 'applied', name: migrationName };
    } catch (error) {
      console.error(`  ✗ Failed to apply migration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runAll() {
    console.log('========================================');
    console.log('Database Migration Runner');
    console.log('========================================\n');

    try {
      await this.connect();
      
      const migrationFiles = await this.getMigrationFiles();
      
      if (migrationFiles.length === 0) {
        console.log('No migration files found.');
        return;
      }

      console.log(`Found ${migrationFiles.length} migration file(s)\n`);

      const results = [];
      for (const file of migrationFiles) {
        const result = await this.runMigration(file);
        results.push(result);
      }

      // Summary
      console.log('\n========================================');
      console.log('Migration Summary');
      console.log('========================================');
      console.log(`Total migrations: ${results.length}`);
      console.log(`Applied: ${results.filter(r => r.status === 'applied').length}`);
      console.log(`Skipped: ${results.filter(r => r.status === 'skipped').length}`);
      console.log('\n✓ All migrations completed successfully!\n');

    } catch (error) {
      console.error('\n✗ Migration failed:', error.message);
      console.error(error.stack);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Rollback last migration (if rollback file exists)
   */
  async rollbackLast() {
    console.log('Rollback functionality not yet implemented');
    // TODO: Implement rollback using down migrations
  }

  /**
   * Show migration status
   */
  async status() {
    console.log('========================================');
    console.log('Migration Status');
    console.log('========================================\n');

    try {
      await this.connect();

      const migrationFiles = await this.getMigrationFiles();
      
      console.log('Available migrations:\n');
      
      for (const file of migrationFiles) {
        const migrationName = file.replace('.sql', '');
        const applied = await this.isMigrationApplied(migrationName);
        const status = applied ? '✓ Applied' : '○ Pending';
        console.log(`${status}  ${migrationName}`);
      }

      console.log('');
    } catch (error) {
      console.error('Error checking migration status:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI Interface
if (require.main === module) {
  const runner = new MigrationRunner();
  const command = process.argv[2] || 'run';

  (async () => {
    try {
      switch (command) {
        case 'run':
          await runner.runAll();
          break;
        case 'status':
          await runner.status();
          break;
        case 'rollback':
          await runner.rollbackLast();
          break;
        default:
          console.log('Usage: node migrate.js [run|status|rollback]');
          console.log('  run      - Run all pending migrations (default)');
          console.log('  status   - Show migration status');
          console.log('  rollback - Rollback last migration');
          process.exit(1);
      }
      process.exit(0);
    } catch (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }
  })();
}

module.exports = MigrationRunner;
