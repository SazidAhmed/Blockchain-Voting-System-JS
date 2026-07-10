const { pool } = require('../config/db');
const crypto = require('crypto');

/**
 * Audit Logger Utility
 * Logs all security-relevant events to the audit_logs table
 */

class AuditLogger {
  constructor() {
    this.previousHash = null;
  }

  /**
   * Calculate hash for audit log entry (for tamper detection)
   */
  calculateLogHash(entry) {
    const data = JSON.stringify({
      event_type: entry.event_type,
      user_id: entry.user_id,
      ip_address: entry.ip_address,
      target_type: entry.target_type,
      target_id: entry.target_id,
      timestamp: entry.timestamp,
      previous_hash: this.previousHash
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Log an audit event
   * @param {Object} event - The event to log
   * @param {string} event.type - Event type (VOTE_CAST, USER_LOGIN, etc.)
   * @param {string} event.category - Category (auth, vote, election, node, admin, security)
   * @param {number} event.userId - User ID (nullable)
   * @param {string} event.ipAddress - IP address
   * @param {string} event.userAgent - User agent string
   * @param {string} event.targetType - Resource type (election, user, vote, etc.)
   * @param {string} event.targetId - Resource ID
   * @param {Object} event.details - Additional details (will be JSON stringified)
   * @param {string} event.severity - Severity level (info, warning, error, critical)
   */
  async log(event) {
    try {
      const timestamp = new Date();
      
      const entry = {
        event_type: event.type,
        event_category: event.category || 'security',
        user_id: event.userId || null,
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        target_type: event.targetType || null,
        target_id: event.targetId ? String(event.targetId) : null,
        details: event.details ? JSON.stringify(event.details) : null,
        severity: event.severity || 'info',
        previous_hash: this.previousHash,
        timestamp: timestamp
      };

      // Calculate log hash for tamper detection
      const logHash = this.calculateLogHash(entry);
      entry.log_hash = logHash;

      // Insert into database
      await pool.query(
        `INSERT INTO audit_logs 
        (event_type, event_category, user_id, ip_address, user_agent, 
         target_type, target_id, details, severity, previous_hash, log_hash, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.event_type,
          entry.event_category,
          entry.user_id,
          entry.ip_address,
          entry.user_agent,
          entry.target_type,
          entry.target_id,
          entry.details,
          entry.severity,
          entry.previous_hash,
          entry.log_hash,
          entry.timestamp
        ]
      );

      // Update previous hash for next entry
      this.previousHash = logHash;

      return { success: true, logHash };
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw - audit logging should not break the main flow
      return { success: false, error: error.message };
    }
  }

  /**
   * Log a vote attempt
   */
  async logVote(userId, electionId, success, details, req = null) {
    return this.log({
      type: success ? 'VOTE_CAST' : 'VOTE_FAILED',
      category: 'vote',
      userId,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('user-agent'),
      targetType: 'election',
      targetId: electionId,
      details: {
        ...details,
        success
      },
      severity: success ? 'info' : 'warning'
    });
  }

  /**
   * Log signature verification
   */
  async logSignatureVerification(userId, electionId, success, details, req = null) {
    return this.log({
      type: success ? 'SIGNATURE_VERIFIED' : 'SIGNATURE_FAILED',
      category: 'security',
      userId,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('user-agent'),
      targetType: 'vote',
      targetId: electionId,
      details,
      severity: success ? 'info' : 'error'
    });
  }

  /**
   * Log double-vote attempt
   */
  async logDoubleVoteAttempt(userId, electionId, details, req = null) {
    return this.log({
      type: 'DOUBLE_VOTE_ATTEMPT',
      category: 'security',
      userId,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('user-agent'),
      targetType: 'election',
      targetId: electionId,
      details,
      severity: 'warning'
    });
  }

  /**
   * Log user registration
   */
  async logUserRegistration(userId, institutionId, success, details, req = null) {
    return this.log({
      type: success ? 'USER_REGISTERED' : 'REGISTRATION_FAILED',
      category: 'auth',
      userId,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('user-agent'),
      targetType: 'user',
      targetId: institutionId,
      details,
      severity: success ? 'info' : 'warning'
    });
  }

  /**
   * Log user login
   */
  async logUserLogin(userId, institutionId, success, details, req = null) {
    return this.log({
      type: success ? 'USER_LOGIN' : 'LOGIN_FAILED',
      category: 'auth',
      userId: success ? userId : null,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('user-agent'),
      targetType: 'user',
      targetId: institutionId,
      details,
      severity: success ? 'info' : 'warning'
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(endpoint, details, req = null) {
    return this.log({
      type: 'RATE_LIMIT_EXCEEDED',
      category: 'security',
      userId: req?.user?.id || null,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('user-agent'),
      targetType: 'endpoint',
      targetId: endpoint,
      details,
      severity: 'warning'
    });
  }

  /**
   * Log election creation/update
   */
  async logElectionEvent(userId, electionId, eventType, details, req = null) {
    return this.log({
      type: eventType, // ELECTION_CREATED, ELECTION_UPDATED, ELECTION_STARTED, ELECTION_ENDED
      category: 'election',
      userId,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('user-agent'),
      targetType: 'election',
      targetId: electionId,
      details,
      severity: 'info'
    });
  }

  /**
   * Verify audit log chain integrity
   */
  async verifyIntegrity(limit = 100) {
    try {
      const [logs] = await pool.query(
        'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );

      let previousHash = null;
      let valid = true;
      const results = [];

      // Check in reverse chronological order
      for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        
        // Recalculate hash
        const entry = {
          event_type: log.event_type,
          user_id: log.user_id,
          ip_address: log.ip_address,
          target_type: log.target_type,
          target_id: log.target_id,
          timestamp: log.timestamp,
          previous_hash: previousHash
        };
        
        const calculatedHash = this.calculateLogHash(entry);
        const isValid = calculatedHash === log.log_hash && log.previous_hash === previousHash;
        
        results.push({
          id: log.id,
          event_type: log.event_type,
          timestamp: log.timestamp,
          isValid
        });

        if (!isValid) {
          valid = false;
        }

        previousHash = log.log_hash;
      }

      return { valid, results };
    } catch (error) {
      console.error('Error verifying audit log integrity:', error);
      return { valid: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new AuditLogger();
