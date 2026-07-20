-- 003_add_tally_encryption.sql
-- Adds columns for encrypted tally storage and result release tracking
-- NOTE: This migration is intentionally idempotent (safe to run multiple times).

SET @db_name = DATABASE();

-- tally_key
SET @sql_tally_key = IF(
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'elections'
      AND COLUMN_NAME = 'tally_key'
  ),
  'SELECT 1',
  'ALTER TABLE elections ADD COLUMN tally_key VARCHAR(64) NULL AFTER public_key'
);
PREPARE stmt_tally_key FROM @sql_tally_key;
EXECUTE stmt_tally_key;
DEALLOCATE PREPARE stmt_tally_key;

-- results_released
SET @sql_results_released = IF(
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'elections'
      AND COLUMN_NAME = 'results_released'
  ),
  'SELECT 1',
  'ALTER TABLE elections ADD COLUMN results_released BOOLEAN DEFAULT FALSE AFTER tally_key'
);
PREPARE stmt_results_released FROM @sql_results_released;
EXECUTE stmt_results_released;
DEALLOCATE PREPARE stmt_results_released;

-- results_released_at
SET @sql_results_released_at = IF(
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'elections'
      AND COLUMN_NAME = 'results_released_at'
  ),
  'SELECT 1',
  'ALTER TABLE elections ADD COLUMN results_released_at TIMESTAMP NULL AFTER results_released'
);
PREPARE stmt_results_released_at FROM @sql_results_released_at;
EXECUTE stmt_results_released_at;
DEALLOCATE PREPARE stmt_results_released_at;
