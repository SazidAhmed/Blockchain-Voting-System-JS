-- =====================================================
-- Schema Hardening & Optimization
-- Migration: 005
-- Description: FK fixes, composite indexes, collation upgrade,
-- PK type expansion, VARCHAR sizing, constraints
-- =====================================================

SET @db_name = DATABASE();

-- =====================================================
-- 1. MISSING FOREIGN KEY CONSTRAINTS
-- =====================================================

-- 1a. elections.locked_by → users(id) ON DELETE SET NULL
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'elections' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME = 'fk_elections_locked_by'),
  'ALTER TABLE elections ADD CONSTRAINT fk_elections_locked_by FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1b. blind_tokens.pseudonym_id → users(pseudonym_id) ON DELETE CASCADE
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'blind_tokens' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME = 'fk_blind_tokens_pseudonym'),
  'ALTER TABLE blind_tokens ADD CONSTRAINT fk_blind_tokens_pseudonym FOREIGN KEY (pseudonym_id) REFERENCES users(pseudonym_id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1c. threshold_key_shares.node_id → nodes(node_id) ON DELETE RESTRICT
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'threshold_key_shares' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME = 'fk_tks_node_id'),
  'ALTER TABLE threshold_key_shares ADD CONSTRAINT fk_tks_node_id FOREIGN KEY (node_id) REFERENCES nodes(node_id) ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. MISSING INDEXES ON EXISTING FOREIGN KEYS
-- =====================================================

-- 2a. nodes.added_by
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'nodes' AND INDEX_NAME = 'idx_added_by'),
  'CREATE INDEX idx_added_by ON nodes(added_by)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2b. admin_security_logs.acknowledged_by
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'admin_security_logs' AND INDEX_NAME = 'idx_acknowledged_by'),
  'CREATE INDEX idx_acknowledged_by ON admin_security_logs(acknowledged_by)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2c. system_config.updated_by
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'system_config' AND INDEX_NAME = 'idx_updated_by'),
  'CREATE INDEX idx_updated_by ON system_config(updated_by)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2d. elections.locked_by
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'elections' AND INDEX_NAME = 'idx_locked_by'),
  'CREATE INDEX idx_locked_by ON elections(locked_by)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =====================================================

-- 3a. candidates(election_id, name) — covers ORDER BY name in results
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'candidates' AND INDEX_NAME = 'idx_election_name'),
  'CREATE INDEX idx_election_name ON candidates(election_id, name)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3b. voter_registrations(election_id, status) — COUNT aggregates
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'voter_registrations' AND INDEX_NAME = 'idx_election_status'),
  'CREATE INDEX idx_election_status ON voter_registrations(election_id, status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3c. votes_meta(election_id, block_index) — tally ordering
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'votes_meta' AND INDEX_NAME = 'idx_election_block'),
  'CREATE INDEX idx_election_block ON votes_meta(election_id, block_index)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3d. blind_tokens(pseudonym_id, election_id) — token validity lookups
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'blind_tokens' AND INDEX_NAME = 'idx_pseudonym_election'),
  'CREATE INDEX idx_pseudonym_election ON blind_tokens(pseudonym_id, election_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3e. audit_logs(event_type, timestamp) — time-range-per-type queries
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_event_type_timestamp'),
  'CREATE INDEX idx_event_type_timestamp ON audit_logs(event_type, timestamp)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3f. admin_audit_logs(admin_id, timestamp) — paginated admin audit list
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'admin_audit_logs' AND INDEX_NAME = 'idx_admin_timestamp'),
  'CREATE INDEX idx_admin_timestamp ON admin_audit_logs(admin_id, timestamp)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 4. REMOVE REDUNDANT INDEXES (DUPLICATE OF UNIQUE)
-- =====================================================

-- MySQL auto-indexes UNIQUE columns; these explicit indexes are redundant
-- Note: MySQL 8.0 does not support DROP INDEX IF EXISTS, so we use INFORMATION_SCHEMA checks
SET @sql = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_institution_id'), 'DROP INDEX idx_institution_id ON users', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_email'), 'DROP INDEX idx_email ON users', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_pseudonym_id'), 'DROP INDEX idx_pseudonym_id ON users', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'blind_tokens' AND INDEX_NAME = 'idx_token_id_hash'), 'DROP INDEX idx_token_id_hash ON blind_tokens', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'votes_meta' AND INDEX_NAME = 'idx_tx_hash'), 'DROP INDEX idx_tx_hash ON votes_meta', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'votes_meta' AND INDEX_NAME = 'idx_nullifier_hash'), 'DROP INDEX idx_nullifier_hash ON votes_meta', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4b. Low-cardinality standalone indexes unlikely to be used
SET @sql = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_role'), 'DROP INDEX idx_role ON users', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF(EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'candidates' AND INDEX_NAME = 'idx_display_order'), 'DROP INDEX idx_display_order ON candidates', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 5. PK TYPE EXPANSION (INT → BIGINT UNSIGNED)
-- High-growth tables that could exceed 2.1B rows
-- =====================================================

-- 5a. Drop FK referencing votes_meta.id to allow PK type change
SET @fk_name = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'tally_partial_decryptions' AND COLUMN_NAME = 'vote_meta_id' AND REFERENCED_TABLE_NAME = 'votes_meta' LIMIT 1);
SET @sql = IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE tally_partial_decryptions DROP FOREIGN KEY ', @fk_name), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5b. Change PKs and referencing FK column to BIGINT UNSIGNED
ALTER TABLE votes_meta MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE tally_partial_decryptions MODIFY COLUMN vote_meta_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE vote_receipts MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE blind_tokens MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE admin_audit_logs MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE admin_security_logs MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE tally_partial_decryptions MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;

-- 5c. Recreate FK on tally_partial_decryptions.vote_meta_id
SET @sql = IF(@fk_name IS NOT NULL, 'ALTER TABLE tally_partial_decryptions ADD CONSTRAINT tally_partial_decryptions_ibfk_vote_meta FOREIGN KEY (vote_meta_id) REFERENCES votes_meta(id) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 6. VARCHAR SIZING CORRECTIONS
-- =====================================================

ALTER TABLE users MODIFY COLUMN password VARCHAR(60) NOT NULL COMMENT 'Bcrypt hashed password';
ALTER TABLE users MODIFY COLUMN mfa_secret VARCHAR(64) COMMENT 'Encrypted TOTP secret';

-- admin_audit_logs.changes: LONGTEXT (4GB) → MEDIUMTEXT (16MB) for JSON diffs
ALTER TABLE admin_audit_logs MODIFY COLUMN changes MEDIUMTEXT;

-- =====================================================
-- 7. UNIQUE CONSTRAINT ON vote_receipts
-- =====================================================

SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'vote_receipts' AND CONSTRAINT_TYPE = 'UNIQUE'),
  'ALTER TABLE vote_receipts ADD CONSTRAINT unique_tx UNIQUE (transaction_hash)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 8. MISSING COLUMNS
-- =====================================================

-- 8a. candidates.locked_by and updated_at
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'candidates' AND COLUMN_NAME = 'locked_by'),
  'ALTER TABLE candidates ADD COLUMN locked_by INT NULL AFTER is_locked',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'candidates' AND COLUMN_NAME = 'updated_at'),
  'ALTER TABLE candidates ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER locked_by',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8b. candidates.locked_by FK
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'candidates' AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME = 'fk_candidates_locked_by'),
  'ALTER TABLE candidates ADD CONSTRAINT fk_candidates_locked_by FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 9. VIEW FIX — remove TEXT from GROUP BY
-- =====================================================

DROP VIEW IF EXISTS v_active_elections;
CREATE VIEW v_active_elections AS
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
-- 10. RECORD THIS MIGRATION
-- =====================================================

INSERT INTO schema_migrations (migration_name) VALUES ('005_fix_schema_issues');

-- =====================================================
-- END OF MIGRATION 005
-- =====================================================
