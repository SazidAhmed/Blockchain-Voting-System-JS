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
      elections: [],
      candidates: [],
      nodes: []
    };
  }

  async connect() {
    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'voting'
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
      'voter_registrations',
      'blind_tokens',
      'candidates',
      'elections',
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
      },
      {
        institution_id: 'STU001',
        username: 'Alice Student',
        password: await bcrypt.hash('password123', 10),
        role: 'student',
        email: 'alice@university.edu',
        registration_status: 'verified'
      },
      {
        institution_id: 'STU002',
        username: 'Bob Student',
        password: await bcrypt.hash('password123', 10),
        role: 'student',
        email: 'bob@university.edu',
        registration_status: 'verified'
      },
      {
        institution_id: 'STU003',
        username: 'Charlie Student',
        password: await bcrypt.hash('password123', 10),
        role: 'student',
        email: 'charlie@university.edu',
        registration_status: 'verified'
      },
      {
        institution_id: 'TEACH001',
        username: 'Dr. Smith',
        password: await bcrypt.hash('password123', 10),
        role: 'teacher',
        email: 'smith@university.edu',
        registration_status: 'verified'
      },
      {
        institution_id: 'STAFF001',
        username: 'Jane Staff',
        password: await bcrypt.hash('password123', 10),
        role: 'staff',
        email: 'jane.staff@university.edu',
        registration_status: 'verified'
      },
      {
        institution_id: 'BOARD001',
        username: 'Board Member Johnson',
        password: await bcrypt.hash('password123', 10),
        role: 'board_member',
        email: 'johnson@university.edu',
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

  async seedElections() {
    console.log('\n→ Seeding elections...');

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const elections = [
      {
        title: 'Student Union President Election 2025',
        description: 'Vote for the next Student Union President. Eligible voters: Students only.',
        start_date: now,
        end_date: nextWeek,
        status: 'active',
        eligible_roles: JSON.stringify(['student'])
      },
      {
        title: 'University Board Election',
        description: 'Election for university board members. All faculty and staff can vote.',
        start_date: tomorrow,
        end_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        status: 'pending',
        eligible_roles: JSON.stringify(['teacher', 'staff', 'board_member'])
      },
      {
        title: 'Budget Allocation Referendum',
        description: 'Referendum on the proposed budget allocation for 2026.',
        start_date: lastWeek,
        end_date: yesterday,
        status: 'completed',
        eligible_roles: JSON.stringify(['student', 'teacher', 'staff', 'board_member'])
      }
    ];

    const adminId = this.createdIds.users[0]; // Admin user

    for (const election of elections) {
      const publicKey = crypto.randomBytes(32).toString('hex');
      const thresholdParams = JSON.stringify({ t: 2, n: 3, algorithm: 'ElGamal' });

      const [result] = await this.connection.query(
        `INSERT INTO elections 
         (title, description, start_date, end_date, status, created_by, public_key, threshold_params, eligible_roles)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [election.title, election.description, election.start_date, election.end_date,
         election.status, adminId, publicKey, thresholdParams, election.eligible_roles]
      );

      this.createdIds.elections.push(result.insertId);
      console.log(`  ✓ Created election: ${election.title} (${election.status})`);
    }
  }

  async seedCandidates() {
    console.log('\n→ Seeding candidates...');

    const candidatesByElection = [
      // Student Union President candidates
      [
        { name: 'Emma Wilson', description: 'Computer Science senior. Focus: Technology and innovation in student services.' },
        { name: 'Michael Chen', description: 'Business Administration senior. Focus: Financial transparency and affordability.' },
        { name: 'Sofia Rodriguez', description: 'Political Science senior. Focus: Diversity and inclusion initiatives.' }
      ],
      // University Board candidates
      [
        { name: 'Prof. David Anderson', description: 'Professor of Economics. 15 years of experience in university governance.' },
        { name: 'Dr. Lisa Thompson', description: 'Associate Professor of Engineering. Advocate for STEM programs.' },
        { name: 'Mark Davis', description: 'Director of Student Affairs. Focus on student wellbeing and campus life.' }
      ],
      // Budget Referendum options
      [
        { name: 'Approve Budget', description: 'Vote YES to approve the proposed 2026 budget allocation.' },
        { name: 'Reject Budget', description: 'Vote NO to reject the proposed budget and request revisions.' }
      ]
    ];

    for (let i = 0; i < this.createdIds.elections.length; i++) {
      const electionId = this.createdIds.elections[i];
      const candidates = candidatesByElection[i];

      for (let j = 0; j < candidates.length; j++) {
        const candidate = candidates[j];
        const metadata = JSON.stringify({ 
          displayOrder: j + 1,
          imageUrl: null 
        });

        const [result] = await this.connection.query(
          `INSERT INTO candidates 
           (election_id, name, description, metadata, display_order)
           VALUES (?, ?, ?, ?, ?)`,
          [electionId, candidate.name, candidate.description, metadata, j + 1]
        );

        this.createdIds.candidates.push(result.insertId);
        console.log(`  ✓ Created candidate: ${candidate.name}`);
      }
    }
  }

  async seedNodes() {
    console.log('\n→ Seeding validator nodes...');

    const nodes = [
      {
        node_id: 'validator-node-1',
        endpoint: 'http://localhost:3001',
        p2p_endpoint: 'tcp://localhost:26656',
        node_type: 'validator',
        status: 'active'
      },
      {
        node_id: 'validator-node-2',
        endpoint: 'http://localhost:3002',
        p2p_endpoint: 'tcp://localhost:26657',
        node_type: 'validator',
        status: 'active'
      },
      {
        node_id: 'validator-node-3',
        endpoint: 'http://localhost:3003',
        p2p_endpoint: 'tcp://localhost:26658',
        node_type: 'validator',
        status: 'active'
      },
      {
        node_id: 'observer-node-1',
        endpoint: 'http://localhost:3004',
        p2p_endpoint: 'tcp://localhost:26659',
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

  async seedVoterRegistrations() {
    console.log('\n→ Seeding voter registrations...');

    // Register students for Student Union election (election 1)
    const studentIds = this.createdIds.users.slice(1, 4); // Alice, Bob, Charlie
    const studentElectionId = this.createdIds.elections[0];

    for (const userId of studentIds) {
      const registrationToken = crypto.randomBytes(16).toString('hex');

      await this.connection.query(
        `INSERT INTO voter_registrations 
         (user_id, election_id, registration_token, status)
         VALUES (?, ?, ?, 'registered')`,
        [userId, studentElectionId, registrationToken]
      );
    }

    console.log(`  ✓ Registered 3 students for Student Union election`);

    // Register all users for completed budget referendum
    const budgetElectionId = this.createdIds.elections[2];
    
    for (const userId of this.createdIds.users.slice(1, 5)) { // Skip admin
      const registrationToken = crypto.randomBytes(16).toString('hex');

      await this.connection.query(
        `INSERT INTO voter_registrations 
         (user_id, election_id, registration_token, status)
         VALUES (?, ?, ?, 'voted')`,
        [userId, budgetElectionId, registrationToken]
      );
    }

    console.log(`  ✓ Registered 4 users for Budget referendum (marked as voted)`);
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
      await this.seedElections();
      await this.seedCandidates();
      await this.seedNodes();
      await this.seedVoterRegistrations();
      await this.seedSystemConfig();

      console.log('\n========================================');
      console.log('Seeding Summary');
      console.log('========================================');
      console.log(`Users created: ${this.createdIds.users.length}`);
      console.log(`Elections created: ${this.createdIds.elections.length}`);
      console.log(`Candidates created: ${this.createdIds.candidates.length}`);
      console.log(`Nodes created: ${this.createdIds.nodes.length}`);
      console.log('\n✓ Database seeding completed successfully!');
      console.log('\n📝 Login Credentials (Development Only):');
      console.log('  Admin:    ADMIN001 / admin123');
      console.log('  Student:  STU001 / password123');
      console.log('  Teacher:  TEACH001 / password123');
      console.log('  Staff:    STAFF001 / password123\n');

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
