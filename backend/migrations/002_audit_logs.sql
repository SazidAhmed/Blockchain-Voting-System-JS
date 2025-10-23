-- Audit Logs Table Migration
-- Created: October 23, 2025
-- Purpose: Track all security-relevant events in the system

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- User information (nullable for anonymous actions)
  user_id INT NULL,
  
  -- Action details
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INT NULL,
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Additional context
  details TEXT NULL,
  error_message TEXT NULL,
  
  -- Request metadata
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for common queries
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource_type (resource_type),
  INDEX idx_success (success),
  INDEX idx_created_at (created_at),
  INDEX idx_user_action (user_id, action),
  
  -- Foreign key
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index for audit log queries by date range
CREATE INDEX idx_created_at_success ON audit_logs(created_at, success);

-- Add comments for documentation
ALTER TABLE audit_logs COMMENT = 'Audit log for all security-relevant events in the voting system';

-- Sample actions to be logged:
-- VOTE_CAST, VOTE_FAILED, SIGNATURE_VERIFIED, SIGNATURE_FAILED, 
-- DOUBLE_VOTE_ATTEMPT, USER_REGISTERED, USER_LOGIN, LOGIN_FAILED,
-- RATE_LIMIT_EXCEEDED, ELECTION_CREATED, ELECTION_UPDATED
