-- =====================================================
-- Backend Crypto Integration - Add Encryption Fields
-- Migration: 002
-- Description: Add encryption_public_key field for RSA-OAEP encryption
-- Date: 2025-10-21
-- =====================================================

-- Add encryption public key field to users table
-- This is separate from the signing public_key already in schema
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS encryption_public_key TEXT COMMENT 'RSA-OAEP public key for encrypting ballots';

-- Update votes_meta table to store signature verification data
ALTER TABLE votes_meta 
  ADD COLUMN IF NOT EXISTS signature TEXT COMMENT 'ECDSA signature of the vote package',
  ADD COLUMN IF NOT EXISTS voter_public_key TEXT COMMENT 'Public key used for signature verification (unlinkable to user)';

-- Add index for faster signature verification lookups
ALTER TABLE votes_meta 
  ADD INDEX IF NOT EXISTS idx_signature (signature(64));

-- Record this migration
INSERT INTO schema_migrations (migration_name, checksum) VALUES
    ('002_add_crypto_fields', SHA2('002_add_crypto_fields.sql', 256))
ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP;

-- =====================================================
-- END OF MIGRATION 002
-- =====================================================
