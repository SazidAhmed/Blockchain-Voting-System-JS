/**
 * Database Seed Script
 * Creates sample data for development and testing
 * 
 * WARNING: Only run this in development environments!
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

class DatabaseSeeder {
  constructor() {
    this.connection = null;
    this.createdIds = {
      users: [],
      nodes: []
    };
  }

  async connect() {
    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'voting_db'
    });
    console.log('✓ Connected to database');
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('✓ Disconnected from database');
    }
  }

  generatePseudonymId(institutionId) {
    return crypto.createHash('sha256').update(institutionId).digest('hex');
  }

  async clearExistingData() {
    console.log('\n→ Clearing existing seed data...');
    
    const tables = [
      'vote_receipts',
      'votes_meta',
      'tally_partial_decryptions',
      'threshold_key_shares',
      'blind_tokens',
      'audit_logs',
      'nodes',
      'users'
    ];

    for (const table of tables) {
      await this.connection.query(`DELETE FROM ${table} WHERE 1=1`);
    }
    
    console.log('  ✓ Cleared existing data');
  }

  async seedUsers() {
    console.log('\n→ Seeding users...');

    const users = [
      {
        institution_id: 'ADMIN001',
        username: 'Admin User',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        email: 'admin@university.edu',
        registration_status: 'verified'
      }
    ];

    for (const user of users) {
      const publicKey = crypto.randomBytes(32).toString('hex');
      const pseudonymId = this.generatePseudonymId(user.institution_id);

      const [result] = await this.connection.query(
        `INSERT INTO users 
         (institution_id, username, password, role, email, public_key, pseudonym_id, registration_status, mfa_enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.institution_id, user.username, user.password, user.role, user.email,
         publicKey, pseudonymId, user.registration_status, false]
      );

      this.createdIds.users.push(result.insertId);
      console.log(`  ✓ Created user: ${user.username} (${user.role})`);
    }
  }





  async seedNodes() {
    console.log('\n→ Seeding validator nodes...');

    const node1Port = process.env.BLOCKCHAIN_NODE1_PORT || '3001';
    const node2Port = process.env.BLOCKCHAIN_NODE2_PORT || '3002';
    const node3Port = process.env.BLOCKCHAIN_NODE3_PORT || '3003';
    const node4Port = process.env.BLOCKCHAIN_NODE4_PORT || '3004';

    const nodes = [
      {
        node_id: 'validator-node-1',
        endpoint: `http://localhost:${node1Port}`,
        p2p_endpoint: `tcp://localhost:26656`,
        node_type: 'validator',
        status: 'active'
      },
      {
        node_id: 'validator-node-2',
        endpoint: `http://localhost:${node2Port}`,
        p2p_endpoint: `tcp://localhost:26657`,
        node_type: 'validator',
        status: 'active'
      },
      {
        node_id: 'validator-node-3',
        endpoint: `http://localhost:${node3Port}`,
        p2p_endpoint: `tcp://localhost:26658`,
        node_type: 'validator',
        status: 'active'
      },
      {
        node_id: 'observer-node-1',
        endpoint: `http://localhost:${node4Port}`,
        p2p_endpoint: `tcp://localhost:26659`,
        node_type: 'observer',
        status: 'active'
      }
    ];

    const adminId = this.createdIds.users[0];

    for (const node of nodes) {
      const pubkey = crypto.randomBytes(32).toString('hex');
      const quorumVotes = JSON.stringify([]);

      const [result] = await this.connection.query(
        `INSERT INTO nodes 
         (node_id, pubkey, endpoint, p2p_endpoint, node_type, status, added_by, approved_at, quorum_votes, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())`,
        [node.node_id, pubkey, node.endpoint, node.p2p_endpoint, 
         node.node_type, node.status, adminId, quorumVotes]
      );

      this.createdIds.nodes.push(result.insertId);
      console.log(`  ✓ Created node: ${node.node_id} (${node.node_type})`);
    }
  }



  async seedSystemConfig() {
    console.log('\n→ Updating system configuration...');

    const configs = [
      { key: 'consensus_type', value: 'pbft' },
      { key: 'min_validators', value: '3' },
      { key: 'block_time_ms', value: '500' },
      { key: 'votes_per_block', value: '1000' },
      { key: 'mfa_required', value: 'false' }, // Disabled for development
      { key: 'threshold_t', value: '2' },
      { key: 'threshold_n', value: '3' }
    ];

    for (const config of configs) {
      await this.connection.query(
        `UPDATE system_config SET config_value = ? WHERE config_key = ?`,
        [config.value, config.key]
      );
    }

    console.log(`  ✓ Updated system configuration`);
  }

  async seed() {
    console.log('========================================');
    console.log('Database Seeder - Development Data');
    console.log('========================================\n');

    console.log('⚠️  WARNING: This will delete existing data!\n');

    try {
      await this.connect();
      await this.clearExistingData();
      await this.seedUsers();
      await this.seedNodes();
      await this.seedSystemConfig();

      console.log('\n========================================');
      console.log('Seeding Summary');
      console.log('========================================');
      console.log(`Users created: ${this.createdIds.users.length}`);
      console.log(`Nodes created: ${this.createdIds.nodes.length}`);
      console.log('\n  ℹ️  Elections and candidates are not seeded - create them via the admin panel.');
      console.log('\n✓ Database seeding completed successfully!');
      console.log('\n📝 Login Credentials (Development Only):');
      console.log('  Admin:    ADMIN001 / admin123\n');

    } catch (error) {
      console.error('\n✗ Seeding failed:', error.message);
      console.error(error.stack);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run seeder if called directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.seed().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = DatabaseSeeder;
