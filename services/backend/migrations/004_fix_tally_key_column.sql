-- 004_fix_tally_key_column.sql
-- Fixes tally_key column type: VARCHAR(64) is too small for RSA PEM keys (~1700 chars).
-- Idempotent: only alters if the column is currently VARCHAR(64).

SET @db_name = DATABASE();

SET @sql_fix_tally_key = IF(
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'elections'
      AND COLUMN_NAME = 'tally_key'
      AND DATA_TYPE = 'varchar'
      AND CHARACTER_MAXIMUM_LENGTH < 1000
  ),
  'ALTER TABLE elections MODIFY COLUMN tally_key TEXT NULL',
  'SELECT 1'
);
PREPARE stmt_fix_tally_key FROM @sql_fix_tally_key;
EXECUTE stmt_fix_tally_key;
DEALLOCATE PREPARE stmt_fix_tally_key;
