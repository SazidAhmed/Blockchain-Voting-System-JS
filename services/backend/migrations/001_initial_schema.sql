-- =====================================================
-- University Blockchain Voting System - Initial Schema
-- Migration: 001 (Consolidated)
-- Description: Complete database schema for the voting system
-- Date: 2026-08-02
-- 
-- TABLE OF CONTENTS:
-- 1. Core Tables (Users, Elections, Candidates)
-- 2. Voting Tables (Blind Tokens, Voter Registrations, Votes, Receipts)
-- 3. Blockchain Tables (Nodes, Threshold Keys, Partial Decryptions)
-- 4. Audit Tables (Audit Logs, Admin Audit/Security Logs)
-- 5. System Tables (Config, OTP, Token Blacklist, Migrations)
-- 6. Views (Active Elections, Node Health, Admin Activity)
-- =====================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =====================================================
-- SECTION 1: CORE TABLES
-- =====================================================

-- =====================================================
-- USERS TABLE
-- Stores voter/admin accounts with encrypted profile data
-- Key fields: institution_id, pseudonym_id, public keys
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique university ID',
    username VARCHAR(100) NOT NULL,
    password VARCHAR(60) NOT NULL COMMENT 'Bcrypt hashed password (60 chars)',
    role ENUM('student', 'teacher', 'staff', 'board_member', 'admin') NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    public_key TEXT COMMENT 'User public key for signing votes',
    encryption_public_key TEXT COMMENT 'RSA-OAEP public key for encrypting ballots',
    
    pseudonym_id VARCHAR(64) UNIQUE NOT NULL COMMENT 'SHA256 hash for on-chain identity',
    
    encrypted_profile_blob TEXT COMMENT 'Encrypted PII data',
    
    registration_status ENUM('pending', 'verified', 'active', 'suspended') DEFAULT 'pending',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(64) COMMENT 'Encrypted TOTP secret',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_registration_status (registration_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registered voters and administrators';

-- =====================================================
-- ELECTIONS TABLE
-- Election configurations with threshold encryption keys
-- Key fields: status, public_key, tally_key, threshold_params
-- =====================================================
CREATE TABLE IF NOT EXISTS elections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    
    status ENUM('pending', 'active', 'completed', 'cancelled', 'tallying') DEFAULT 'pending',
    
    public_key TEXT NOT NULL COMMENT 'Threshold encryption public key (ElGamal)',
    tally_key TEXT NULL COMMENT 'AES key for encrypted tally (RSA PEM ~1700 chars)',
    threshold_params JSON COMMENT 'Threshold parameters (t, n, shares)',
    
    results_released BOOLEAN DEFAULT FALSE,
    results_released_at TIMESTAMP NULL,
    
    eligible_roles JSON COMMENT 'Array of roles allowed to vote',
    
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    tally_completed_at TIMESTAMP NULL,
    results_hash VARCHAR(64) COMMENT 'SHA256 hash of final tally',
    
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP NULL,
    locked_by INT NULL,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_created_by (created_by),
    INDEX idx_locked_by (locked_by),
    INDEX idx_auto_release (status, results_released, end_date) COMMENT 'Composite index for auto-release scheduler'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Election configurations';

-- =====================================================
-- CANDIDATES TABLE
-- Candidate information for each election
-- Key fields: election_id, name, display_order
-- =====================================================
CREATE TABLE IF NOT EXISTS candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSON COMMENT 'Additional candidate information',
    
    display_order INT DEFAULT 0,
    
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP NULL,
    locked_by INT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_election_id (election_id),
    INDEX idx_election_name (election_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Election candidates';


-- =====================================================
-- SECTION 2: VOTING TABLES
-- =====================================================

-- =====================================================
-- BLIND_TOKENS TABLE
-- Blind-signed eligibility tokens for unlinkable voting
-- Key fields: token_id_hash, pseudonym_id, election_id
-- =====================================================
CREATE TABLE IF NOT EXISTS blind_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    token_id_hash VARCHAR(64) UNIQUE NOT NULL COMMENT 'SHA256 hash of token ID',
    
    pseudonym_id VARCHAR(64) NOT NULL COMMENT 'Links to users.pseudonym_id',
    
    election_id INT NOT NULL COMMENT 'Token valid for this election',
    
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    revocation_reason VARCHAR(255),
    
    blind_signature TEXT COMMENT 'Signed blinded token (base64)',
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (pseudonym_id) REFERENCES users(pseudonym_id) ON DELETE CASCADE,
    INDEX idx_election_id (election_id),
    INDEX idx_revoked (revoked),
    INDEX idx_pseudonym_election (pseudonym_id, election_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Blind-signed eligibility tokens';

-- =====================================================
-- VOTER_REGISTRATIONS TABLE
-- Tracks voter registration and voting status
-- Key fields: user_id, election_id, status (registered/voted)
-- =====================================================
CREATE TABLE IF NOT EXISTS voter_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    election_id INT NOT NULL,
    
    registration_token VARCHAR(255) UNIQUE,
    
    status ENUM('registered', 'voted', 'revoked') DEFAULT 'registered',
    
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voted_at TIMESTAMP NULL,
    
    UNIQUE KEY unique_user_election (user_id, election_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    INDEX idx_election_id (election_id),
    INDEX idx_status (status),
    INDEX idx_election_status (election_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Voter registration tracking';

-- =====================================================
-- VOTES_META TABLE
-- Vote metadata with blockchain references and nullifiers
-- Key fields: tx_hash, nullifier_hash, encrypted_ballot, signature
-- =====================================================
CREATE TABLE IF NOT EXISTS votes_meta (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    tx_hash VARCHAR(64) UNIQUE NOT NULL COMMENT 'Transaction hash from blockchain',
    block_index INT NOT NULL COMMENT 'Block number where vote was included',
    
    election_id INT NOT NULL,
    
    nullifier_hash VARCHAR(64) UNIQUE NOT NULL COMMENT 'SHA256 of nullifier',
    
    cipher_ref TEXT COMMENT 'Reference to encrypted ballot (on-chain or off-chain)',
    encrypted_ballot TEXT COMMENT 'Encrypted ballot data (threshold encrypted)',
    
    signature TEXT COMMENT 'ECDSA signature of the vote package',
    voter_public_key TEXT COMMENT 'Public key used for signature verification (unlinkable to user)',
    
    merkle_root VARCHAR(64) COMMENT 'Merkle root of block',
    merkle_proof JSON COMMENT 'Merkle inclusion proof',
    
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT,
    INDEX idx_election_id (election_id),
    INDEX idx_block_index (block_index),
    INDEX idx_timestamp (timestamp),
    INDEX idx_signature (signature(64)),
    INDEX idx_election_block (election_id, block_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vote metadata and nullifiers';

-- =====================================================
-- VOTE_RECEIPTS TABLE
-- Cryptographic receipts for vote verification
-- Key fields: transaction_hash, nullifier_hash, merkle_proof
-- =====================================================
CREATE TABLE IF NOT EXISTS vote_receipts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    election_id INT NOT NULL,
    
    nullifier_hash VARCHAR(64) NOT NULL COMMENT 'SHA256 of nullifier for verification',
    
    transaction_hash VARCHAR(64) NOT NULL COMMENT 'Transaction ID on blockchain',
    block_height INT COMMENT 'Block number',
    block_hash VARCHAR(64) COMMENT 'Block hash',
    
    merkle_proof JSON COMMENT 'Merkle proof for verification',
    
    validator_signatures JSON COMMENT 'Array of validator signatures on receipt',
    
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_tx (transaction_hash),
    INDEX idx_election_id (election_id),
    INDEX idx_nullifier_hash (nullifier_hash),
    INDEX idx_block_height (block_height)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vote receipts for verification';


-- =====================================================
-- SECTION 3: BLOCKCHAIN TABLES
-- =====================================================

-- =====================================================
-- NODES TABLE
-- Validator/observer node registry and health tracking
-- Key fields: node_id, status, node_type, misbehavior_count
-- =====================================================
CREATE TABLE IF NOT EXISTS nodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    node_id VARCHAR(64) UNIQUE NOT NULL COMMENT 'Unique node identifier',
    pubkey TEXT NOT NULL COMMENT 'Node public key for validation',
    
    endpoint VARCHAR(255) NOT NULL COMMENT 'Node API endpoint (host:port)',
    p2p_endpoint VARCHAR(255) COMMENT 'P2P connection endpoint',
    
    node_type ENUM('validator', 'observer', 'seed') DEFAULT 'validator',
    status ENUM('active', 'inactive', 'quarantined', 'removed') DEFAULT 'active',
    
    added_by INT COMMENT 'Admin who added this node',
    approved_at TIMESTAMP NULL,
    quorum_votes JSON COMMENT 'Votes from other validators for approval',
    
    last_seen TIMESTAMP NULL,
    last_block_validated INT,
    blocks_validated_count INT DEFAULT 0,
    
    misbehavior_count INT DEFAULT 0,
    evidence JSON COMMENT 'Array of misbehavior evidence',
    quarantined_at TIMESTAMP NULL,
    quarantine_reason VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_node_id (node_id),
    INDEX idx_status (status),
    INDEX idx_node_type (node_type),
    INDEX idx_last_seen (last_seen),
    INDEX idx_added_by (added_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Validator and observer nodes';


-- =====================================================
-- SECTION 4: AUDIT TABLES
-- =====================================================

-- =====================================================
-- AUDIT_LOGS TABLE
-- Tamper-evident audit trail for all system events
-- Key fields: event_type, user_id, log_hash, previous_hash
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    
    event_type VARCHAR(50) NOT NULL COMMENT 'e.g., USER_REGISTERED, VOTE_CAST, NODE_ADDED',
    event_category ENUM('auth', 'vote', 'election', 'node', 'admin', 'security') NOT NULL,
    
    user_id INT COMMENT 'User who performed the action (if applicable)',
    ip_address VARCHAR(45) COMMENT 'IPv4 or IPv6 address',
    user_agent TEXT COMMENT 'Browser/client information',
    
    target_type VARCHAR(50) COMMENT 'e.g., election, vote, node',
    target_id VARCHAR(64) COMMENT 'ID of the affected resource',
    
    details JSON COMMENT 'Additional event details',
    
    severity ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
    
    previous_hash VARCHAR(64) COMMENT 'Hash of previous log entry',
    log_hash VARCHAR(64) COMMENT 'Hash of this log entry',
    
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_event_type (event_type),
    INDEX idx_event_category (event_category),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_severity (severity),
    INDEX idx_log_hash (log_hash),
    INDEX idx_event_type_timestamp (event_type, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tamper-evident audit trail';

-- =====================================================
-- ADMIN_AUDIT_LOGS TABLE
-- Admin action audit trail with change tracking
-- Key fields: admin_id, action_type, resource_type, change_hash
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INT,
    changes MEDIUMTEXT,
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
    INDEX idx_admin_timestamp (admin_id, timestamp),
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin audit log entries';

-- =====================================================
-- ADMIN_SECURITY_LOGS TABLE
-- Security event logging for admin actions
-- Key fields: admin_id, event_type, severity, acknowledged
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_security_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
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
    INDEX idx_acknowledged_by (acknowledged_by),
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin security log entries';

-- =====================================================
-- THRESHOLD_KEY_SHARES TABLE
-- Threshold decryption key share metadata (shares stored in vault)
-- Key fields: election_id, node_id, share_index, ceremony_id
-- =====================================================
CREATE TABLE IF NOT EXISTS threshold_key_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    election_id INT NOT NULL,
    
    node_id VARCHAR(64) NOT NULL,
    
    share_index INT NOT NULL COMMENT 'Index of this share (1 to n)',
    public_verification_key TEXT COMMENT 'Public key for verifying this share',
    
    ceremony_id VARCHAR(64) COMMENT 'Unique ID for the DKG ceremony',
    ceremony_completed_at TIMESTAMP NULL,
    
    status ENUM('pending', 'active', 'revoked', 'rotated') DEFAULT 'pending',
    
    vault_path VARCHAR(255) COMMENT 'Path to encrypted share in vault',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id) ON DELETE RESTRICT,
    UNIQUE KEY unique_election_node_share (election_id, node_id, share_index),
    INDEX idx_election_id (election_id),
    INDEX idx_node_id (node_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Threshold key share metadata';

-- =====================================================
-- TALLY_PARTIAL_DECRYPTIONS TABLE
-- Partial decryptions from validators for threshold tallying
-- Key fields: election_id, vote_meta_id, node_id, partial_decryption
-- =====================================================
CREATE TABLE IF NOT EXISTS tally_partial_decryptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    election_id INT NOT NULL,
    vote_meta_id BIGINT UNSIGNED NOT NULL COMMENT 'References votes_meta.id',
    
    node_id VARCHAR(64) NOT NULL,
    
    partial_decryption TEXT NOT NULL COMMENT 'Base64 encoded partial decryption',
    proof_of_correctness TEXT COMMENT 'ZK proof that decryption is correct',
    
    signature TEXT COMMENT 'Validator signature on partial decryption',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT,
    FOREIGN KEY (vote_meta_id) REFERENCES votes_meta(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote_node (vote_meta_id, node_id),
    INDEX idx_election_id (election_id),
    INDEX idx_vote_meta_id (vote_meta_id),
    INDEX idx_node_id (node_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Partial decryptions for threshold tallying';


-- =====================================================
-- SECTION 5: SYSTEM TABLES
-- =====================================================

-- =====================================================
-- SYSTEM_CONFIG TABLE
-- Runtime configuration parameters
-- Key fields: config_key, config_value, config_type
-- =====================================================
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE COMMENT 'Whether value is encrypted',
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_config_key (config_key),
    INDEX idx_updated_by (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System configuration';

-- =====================================================
-- OTP_CODES TABLE
-- One-time passwords for voter registration
-- Key fields: institution_id, code, email, expires_at
-- =====================================================
CREATE TABLE IF NOT EXISTS otp_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institution_id VARCHAR(20) UNIQUE NOT NULL,
    code VARCHAR(10) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    attempts INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    verified_at BIGINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OTP codes for voter registration';

-- =====================================================
-- TOKEN_BLACKLIST TABLE
-- Revoked JWT tokens (logout/invalidation)
-- Key fields: jti (JWT ID), expires_at
-- =====================================================
CREATE TABLE IF NOT EXISTS token_blacklist (
    jti VARCHAR(255) PRIMARY KEY,
    expires_at BIGINT NOT NULL,
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Revoked JWT tokens';

-- =====================================================
-- DEFAULT SYSTEM CONFIGURATION
-- Inserts default blockchain and security parameters
-- =====================================================
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
    ('consensus_type', 'pbft', 'string', 'Consensus algorithm: pbft, tendermint, raft'),
    ('min_validators', '3', 'number', 'Minimum number of validators required'),
    ('block_time_ms', '500', 'number', 'Target block time in milliseconds'),
    ('votes_per_block', '1000', 'number', 'Maximum votes per block'),
    ('mfa_required', 'true', 'boolean', 'Whether MFA is required for voting'),
    ('threshold_t', '2', 'number', 'Threshold t for t-of-n decryption'),
    ('threshold_n', '3', 'number', 'Total number of key shares n')
ON DUPLICATE KEY UPDATE config_value=VALUES(config_value);

-- =====================================================
-- SECTION 6: VIEWS
-- =====================================================

-- =====================================================
-- v_active_elections VIEW
-- Active/pending elections with counts
-- =====================================================
CREATE OR REPLACE VIEW v_active_elections AS
SELECT
    e.id,
    e.title,
    e.description,
    e.start_date,
    e.end_date,
    e.status,
    COUNT(DISTINCT c.id) as candidate_count,
    COUNT(DISTINCT vr.id) as registered_voters,
    COUNT(DISTINCT vm.id) as votes_cast
FROM elections e
LEFT JOIN candidates c ON e.id = c.election_id
LEFT JOIN voter_registrations vr ON e.id = vr.election_id AND vr.status = 'registered'
LEFT JOIN votes_meta vm ON e.id = vm.election_id
WHERE e.status IN ('pending', 'active')
GROUP BY e.id;

-- =====================================================
-- v_node_health VIEW
-- Validator node health status monitoring
-- =====================================================
CREATE OR REPLACE VIEW v_node_health AS
SELECT
    n.node_id,
    n.endpoint,
    n.status,
    n.last_seen,
    n.blocks_validated_count,
    n.misbehavior_count,
    TIMESTAMPDIFF(MINUTE, n.last_seen, NOW()) as minutes_since_last_seen,
    CASE
        WHEN n.status = 'removed' THEN 'removed'
        WHEN n.status = 'quarantined' THEN 'quarantined'
        WHEN TIMESTAMPDIFF(MINUTE, n.last_seen, NOW()) > 10 THEN 'offline'
        WHEN TIMESTAMPDIFF(MINUTE, n.last_seen, NOW()) > 5 THEN 'degraded'
        ELSE 'healthy'
    END as health_status
FROM nodes n
WHERE n.node_type = 'validator';

-- =====================================================
-- admin_activity_summary VIEW
-- Admin action statistics and last activity
-- =====================================================
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

-- =====================================================
-- SCHEMA_MIGRATIONS TABLE
-- Migration version tracking with checksums
-- =====================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64) COMMENT 'SHA256 of migration file'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (migration_name, checksum) VALUES
    ('001_initial_schema', SHA2('001_initial_schema.sql', 256));

-- =====================================================
-- END OF MIGRATION 001
-- =====================================================
