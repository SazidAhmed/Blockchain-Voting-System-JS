/**
 * Admin Audit Logger
 * Comprehensive logging for all admin activities
 */

const mysql = require('mysql2/promise');
const crypto = require('crypto');

class AdminAuditLogger {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Generate audit log entry with cryptographic signature
   */
  async logAdminAction(adminId, actionType, resourceType, resourceId, changes, metadata = {}) {
    try {
      const timestamp = new Date();
      const ipAddress = metadata.ipAddress || 'unknown';
      const userAgent = metadata.userAgent || 'unknown';
      
      // Create change hash for integrity verification
      const changeHash = crypto.createHash('sha256')
        .update(JSON.stringify(changes))
        .digest('hex');
      
      // Create action signature
      const actionSignature = crypto.createHash('sha256')
        .update(`${adminId}${actionType}${resourceId}${timestamp.getTime()}`)
        .digest('hex');

      const query = `
        INSERT INTO admin_audit_logs 
        (admin_id, action_type, resource_type, resource_id, changes, change_hash, 
         action_signature, ip_address, user_agent, metadata, timestamp, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await this.pool.query(query, [
        adminId,
        actionType,
        resourceType,
        resourceId,
        JSON.stringify(changes),
        changeHash,
        actionSignature,
        ipAddress,
        userAgent,
        JSON.stringify(metadata),
        timestamp,
        'success'
      ]);

      console.log(`✓ Admin Action Logged: ${actionType} on ${resourceType} #${resourceId} by admin #${adminId}`);
      
      return result.insertId;
    } catch (error) {
      console.error('Error logging admin action:', error);
      throw error;
    }
  }

  /**
   * Log failed admin action attempts
   */
  async logFailedAction(adminId, actionType, resourceType, resourceId, reason, metadata = {}) {
    try {
      const timestamp = new Date();
      const ipAddress = metadata.ipAddress || 'unknown';

      const query = `
        INSERT INTO admin_audit_logs 
        (admin_id, action_type, resource_type, resource_id, reason, 
         ip_address, metadata, timestamp, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await this.pool.query(query, [
        adminId,
        actionType,
        resourceType,
        resourceId,
        reason,
        ipAddress,
        JSON.stringify(metadata),
        timestamp,
        'failed'
      ]);

      console.warn(`⚠ Failed Admin Action: ${actionType} on ${resourceType} #${resourceId} - Reason: ${reason}`);
      
      return result.insertId;
    } catch (error) {
      console.error('Error logging failed action:', error);
    }
  }

  /**
   * Log security-sensitive operations
   */
  async logSecurityEvent(adminId, eventType, severity, description, metadata = {}) {
    try {
      const timestamp = new Date();
      
      const query = `
        INSERT INTO admin_security_logs 
        (admin_id, event_type, severity, description, metadata, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await this.pool.query(query, [
        adminId,
        eventType,
        severity,
        description,
        JSON.stringify(metadata),
        timestamp
      ]);

      console.log(`🔒 Security Event [${severity}]: ${eventType} - ${description}`);
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Get audit logs for an admin
   */
  async getAdminLogs(adminId, limit = 100, offset = 0) {
    try {
      const query = `
        SELECT * FROM admin_audit_logs 
        WHERE admin_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `;

      const [logs] = await this.pool.query(query, [adminId, limit, offset]);
      return logs;
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      throw error;
    }
  }

  /**
   * Get all security events
   */
  async getSecurityLogs(limit = 100, offset = 0) {
    try {
      const query = `
        SELECT * FROM admin_security_logs 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `;

      const [logs] = await this.pool.query(query, [limit, offset]);
      return logs;
    } catch (error) {
      console.error('Error fetching security logs:', error);
      throw error;
    }
  }

  /**
   * Verify audit log integrity using stored hash
   */
  async verifyAuditIntegrity(logId) {
    try {
      const query = `
        SELECT changes, change_hash FROM admin_audit_logs WHERE id = ?
      `;

      const [logs] = await this.pool.query(query, [logId]);
      
      if (logs.length === 0) {
        return { valid: false, reason: 'Log not found' };
      }

      const log = logs[0];
      const calculatedHash = crypto.createHash('sha256')
        .update(log.changes)
        .digest('hex');

      const isValid = calculatedHash === log.change_hash;
      
      return {
        valid: isValid,
        reason: isValid ? 'Hash matches' : 'Hash mismatch - possible tampering'
      };
    } catch (error) {
      console.error('Error verifying audit log:', error);
      throw error;
    }
  }

  /**
   * Track admin role changes
   */
  async logRoleChange(adminId, previousRole, newRole, changedByAdminId, metadata = {}) {
    await this.logSecurityEvent(
      changedByAdminId,
      'ADMIN_ROLE_CHANGE',
      'HIGH',
      `Admin #${adminId} role changed from ${previousRole} to ${newRole}`,
      { affectedAdminId: adminId, previousRole, newRole }
    );
  }

  /**
   * Track permission changes
   */
  async logPermissionChange(adminId, action, resourceType, metadata = {}) {
    await this.logSecurityEvent(
      adminId,
      'PERMISSION_ATTEMPTED',
      'MEDIUM',
      `Attempted ${action} on ${resourceType}`,
      metadata
    );
  }
}

module.exports = AdminAuditLogger;
