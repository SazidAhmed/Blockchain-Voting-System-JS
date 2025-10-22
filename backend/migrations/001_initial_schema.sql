-- =====================================================
-- University Blockchain Voting System - Initial Schema
-- Migration: 001
-- Description: Create all required tables for the voting system
-- Date: 2025-10-20
-- =====================================================

-- Set character set and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =====================================================
-- USERS TABLE
-- Stores voter information with encrypted profile data
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institution_id VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique university ID',
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    role ENUM('student', 'teacher', 'staff', 'board_member', 'admin') NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    public_key TEXT COMMENT 'User public key for signing votes',
    
    -- Pseudonymous identifier (not linkable to institution_id on-chain)
    pseudonym_id VARCHAR(64) UNIQUE NOT NULL COMMENT 'SHA256 hash for on-chain identity',
    
    -- Encrypted profile data (AES-256)
    encrypted_profile_blob TEXT COMMENT 'Encrypted PII data',
    
    -- Status and metadata
    registration_status ENUM('pending', 'verified', 'active', 'suspended') DEFAULT 'pending',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255) COMMENT 'Encrypted TOTP secret',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    -- Indexes for performance
    INDEX idx_institution_id (institution_id),
    INDEX idx_email (email),
    INDEX idx_pseudonym_id (pseudonym_id),
    INDEX idx_role (role),
    INDEX idx_registration_status (registration_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registered voters and administrators';

-- =====================================================
-- ELECTIONS TABLE
-- Stores election configurations and threshold public keys
-- =====================================================
CREATE TABLE IF NOT EXISTS elections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Election schedule
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    
    -- Status management
    status ENUM('pending', 'active', 'completed', 'cancelled', 'tallying') DEFAULT 'pending',
    
    -- Cryptographic keys
    public_key TEXT NOT NULL COMMENT 'Threshold encryption public key (ElGamal)',
    threshold_params JSON COMMENT 'Threshold parameters (t, n, shares)',
    
    -- Eligibility rules
    eligible_roles JSON COMMENT 'Array of roles allowed to vote',
    
    -- Creator and metadata
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Results
    tally_completed_at TIMESTAMP NULL,
    results_hash VARCHAR(64) COMMENT 'SHA256 hash of final tally',
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Election configurations';

-- =====================================================
-- CANDIDATES TABLE
-- Stores candidates for each election
-- =====================================================
CREATE TABLE IF NOT EXISTS candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    election_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSON COMMENT 'Additional candidate information',
    
    -- Display order
    display_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    INDEX idx_election_id (election_id),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Election candidates';

-- =====================================================
-- BLIND_TOKENS TABLE
-- Stores issued blind-signed tokens (hashed, not linkable)
-- =====================================================
CREATE TABLE IF NOT EXISTS blind_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Token identifier (hashed, not the actual token)
    token_id_hash VARCHAR(64) UNIQUE NOT NULL COMMENT 'SHA256 hash of token ID',
    
    -- Pseudonymous link (not institution_id)
    pseudonym_id VARCHAR(64) NOT NULL COMMENT 'Links to users.pseudonym_id',
    
    -- Election binding
    election_id INT NOT NULL COMMENT 'Token valid for this election',
    
    -- Token lifecycle
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    revocation_reason VARCHAR(255),
    
    -- Cryptographic data
    blind_signature TEXT COMMENT 'Signed blinded token (base64)',
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    INDEX idx_token_id_hash (token_id_hash),
    INDEX idx_pseudonym_id (pseudonym_id),
    INDEX idx_election_id (election_id),
    INDEX idx_revoked (revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Blind-signed eligibility tokens';

-- =====================================================
-- VOTER_REGISTRATIONS TABLE
-- Tracks voter registration status for elections
-- =====================================================
CREATE TABLE IF NOT EXISTS voter_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    election_id INT NOT NULL,
    
    -- Registration token (for backward compatibility, prefer blind_tokens)
    registration_token VARCHAR(255) UNIQUE,
    
    -- Status
    status ENUM('registered', 'voted', 'revoked') DEFAULT 'registered',
    
    -- Timestamps
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voted_at TIMESTAMP NULL,
    
    UNIQUE KEY unique_user_election (user_id, election_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_election_id (election_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Voter registration tracking';

-- =====================================================
-- VOTES_META TABLE
-- On-chain vote metadata and nullifiers (no ballot content)
-- =====================================================
CREATE TABLE IF NOT EXISTS votes_meta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Blockchain reference
    tx_hash VARCHAR(64) UNIQUE NOT NULL COMMENT 'Transaction hash from blockchain',
    block_index INT NOT NULL COMMENT 'Block number where vote was included',
    
    -- Election
    election_id INT NOT NULL,
    
    -- Privacy-preserving nullifier (prevents double voting)
    nullifier_hash VARCHAR(64) UNIQUE NOT NULL COMMENT 'SHA256 of nullifier',
    
    -- Encrypted ballot reference
    cipher_ref TEXT COMMENT 'Reference to encrypted ballot (on-chain or off-chain)',
    encrypted_ballot TEXT COMMENT 'Encrypted ballot data (threshold encrypted)',
    
    -- Merkle proof data
    merkle_root VARCHAR(64) COMMENT 'Merkle root of block',
    merkle_proof JSON COMMENT 'Merkle inclusion proof',
    
    -- Timestamps
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT,
    INDEX idx_tx_hash (tx_hash),
    INDEX idx_election_id (election_id),
    INDEX idx_nullifier_hash (nullifier_hash),
    INDEX idx_block_index (block_index),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vote metadata and nullifiers';

-- =====================================================
-- VOTE_RECEIPTS TABLE
-- Cryptographic receipts given to voters
-- =====================================================
CREATE TABLE IF NOT EXISTS vote_receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Election reference
    election_id INT NOT NULL,
    
    -- Nullifier (allows voter to verify their vote was counted)
    nullifier_hash VARCHAR(64) NOT NULL COMMENT 'SHA256 of nullifier for verification',
    
    -- Blockchain proof
    transaction_hash VARCHAR(64) NOT NULL COMMENT 'Transaction ID on blockchain',
    block_height INT COMMENT 'Block number',
    block_hash VARCHAR(64) COMMENT 'Block hash',
    
    -- Merkle inclusion proof
    merkle_proof JSON COMMENT 'Merkle proof for verification',
    
    -- Validator signatures
    validator_signatures JSON COMMENT 'Array of validator signatures on receipt',
    
    -- Timestamp
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT,
    INDEX idx_election_id (election_id),
    INDEX idx_nullifier_hash (nullifier_hash),
    INDEX idx_transaction_hash (transaction_hash),
    INDEX idx_block_height (block_height)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vote receipts for verification';

-- =====================================================
-- NODES TABLE
-- Validator nodes in the permissioned network
-- =====================================================
CREATE TABLE IF NOT EXISTS nodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Node identification
    node_id VARCHAR(64) UNIQUE NOT NULL COMMENT 'Unique node identifier',
    pubkey TEXT NOT NULL COMMENT 'Node public key for validation',
    
    -- Network information
    endpoint VARCHAR(255) NOT NULL COMMENT 'Node API endpoint (host:port)',
    p2p_endpoint VARCHAR(255) COMMENT 'P2P connection endpoint',
    
    -- Node type and status
    node_type ENUM('validator', 'observer', 'seed') DEFAULT 'validator',
    status ENUM('active', 'inactive', 'quarantined', 'removed') DEFAULT 'active',
    
    -- Governance
    added_by INT COMMENT 'Admin who added this node',
    approved_at TIMESTAMP NULL,
    quorum_votes JSON COMMENT 'Votes from other validators for approval',
    
    -- Health monitoring
    last_seen TIMESTAMP NULL,
    last_block_validated INT,
    blocks_validated_count INT DEFAULT 0,
    
    -- Misbehavior tracking
    misbehavior_count INT DEFAULT 0,
    evidence JSON COMMENT 'Array of misbehavior evidence',
    quarantined_at TIMESTAMP NULL,
    quarantine_reason VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_node_id (node_id),
    INDEX idx_status (status),
    INDEX idx_node_type (node_type),
    INDEX idx_last_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Validator and observer nodes';

-- =====================================================
-- AUDIT_LOGS TABLE
-- Tamper-evident audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL COMMENT 'e.g., USER_REGISTERED, VOTE_CAST, NODE_ADDED',
    event_category ENUM('auth', 'vote', 'election', 'node', 'admin', 'security') NOT NULL,
    
    -- Actor information
    user_id INT COMMENT 'User who performed the action (if applicable)',
    ip_address VARCHAR(45) COMMENT 'IPv4 or IPv6 address',
    user_agent TEXT COMMENT 'Browser/client information',
    
    -- Target information
    target_type VARCHAR(50) COMMENT 'e.g., election, vote, node',
    target_id VARCHAR(64) COMMENT 'ID of the affected resource',
    
    -- Event data
    details JSON COMMENT 'Additional event details',
    
    -- Severity
    severity ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
    
    -- Tamper-evident chaining
    previous_hash VARCHAR(64) COMMENT 'Hash of previous log entry',
    log_hash VARCHAR(64) COMMENT 'Hash of this log entry',
    
    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_event_type (event_type),
    INDEX idx_event_category (event_category),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_severity (severity),
    INDEX idx_log_hash (log_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tamper-evident audit trail';

-- =====================================================
-- THRESHOLD_KEY_SHARES TABLE
-- Stores information about distributed key shares
-- (Actual shares stored in HSM/Vault, this is metadata)
-- =====================================================
CREATE TABLE IF NOT EXISTS threshold_key_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Election binding
    election_id INT NOT NULL,
    
    -- Node holding the share
    node_id VARCHAR(64) NOT NULL,
    
    -- Share metadata (not the actual share)
    share_index INT NOT NULL COMMENT 'Index of this share (1 to n)',
    public_verification_key TEXT COMMENT 'Public key for verifying this share',
    
    -- DKG ceremony information
    ceremony_id VARCHAR(64) COMMENT 'Unique ID for the DKG ceremony',
    ceremony_completed_at TIMESTAMP NULL,
    
    -- Status
    status ENUM('pending', 'active', 'revoked', 'rotated') DEFAULT 'pending',
    
    -- Vault/HSM reference (actual share stored externally)
    vault_path VARCHAR(255) COMMENT 'Path to encrypted share in vault',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_election_node_share (election_id, node_id, share_index),
    INDEX idx_election_id (election_id),
    INDEX idx_node_id (node_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Threshold key share metadata';

-- =====================================================
-- TALLY_PARTIAL_DECRYPTIONS TABLE
-- Stores partial decryptions from validators during tallying
-- =====================================================
CREATE TABLE IF NOT EXISTS tally_partial_decryptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Election and vote reference
    election_id INT NOT NULL,
    vote_meta_id INT NOT NULL COMMENT 'References votes_meta.id',
    
    -- Validator who provided this partial decryption
    node_id VARCHAR(64) NOT NULL,
    
    -- Partial decryption data
    partial_decryption TEXT NOT NULL COMMENT 'Base64 encoded partial decryption',
    proof_of_correctness TEXT COMMENT 'ZK proof that decryption is correct',
    
    -- Signature
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
-- SYSTEM_CONFIG TABLE
-- Global system configuration and parameters
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
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System configuration';

-- =====================================================
-- Insert default system configuration
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
-- Create views for common queries
-- =====================================================

-- View for active elections with candidate counts
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
LEFT JOIN voter_registrations vr ON e.id = vr.election_id
LEFT JOIN votes_meta vm ON e.id = vm.election_id
WHERE e.status IN ('pending', 'active')
GROUP BY e.id, e.title, e.description, e.start_date, e.end_date, e.status;

-- View for node health monitoring
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
-- Schema version tracking
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
