-- =====================================================
-- Backend Crypto Integration - Add Encryption Fields
-- Migration: 002
-- Description: Add encryption_public_key field for RSA-OAEP encryption
-- Date: 2025-10-21
-- =====================================================

-- Add encryption public key field to users table (check if column doesn't exist first)
-- This is separate from the signing public_key already in schema
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'users' 
                   AND COLUMN_NAME = 'encryption_public_key');

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE users ADD COLUMN encryption_public_key TEXT COMMENT ''RSA-OAEP public key for encrypting ballots''', 
    'SELECT ''Column encryption_public_key already exists'' AS message');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update votes_meta table to store signature verification data
SET @col_exists_sig = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                       WHERE TABLE_SCHEMA = DATABASE() 
                       AND TABLE_NAME = 'votes_meta' 
                       AND COLUMN_NAME = 'signature');

SET @query_sig = IF(@col_exists_sig = 0, 
    'ALTER TABLE votes_meta ADD COLUMN signature TEXT COMMENT ''ECDSA signature of the vote package'', ADD COLUMN voter_public_key TEXT COMMENT ''Public key used for signature verification (unlinkable to user)''', 
    'SELECT ''Column signature already exists'' AS message');

PREPARE stmt FROM @query_sig;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for faster signature verification lookups
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = DATABASE() 
                     AND TABLE_NAME = 'votes_meta' 
                     AND INDEX_NAME = 'idx_signature');

SET @query_idx = IF(@index_exists = 0, 
    'ALTER TABLE votes_meta ADD INDEX idx_signature (signature(64))', 
    'SELECT ''Index idx_signature already exists'' AS message');

PREPARE stmt FROM @query_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Record this migration
INSERT INTO schema_migrations (migration_name, checksum) VALUES
    ('002_add_crypto_fields', SHA2('002_add_crypto_fields.sql', 256))
ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP;

-- =====================================================
-- END OF MIGRATION 002
-- =====================================================
