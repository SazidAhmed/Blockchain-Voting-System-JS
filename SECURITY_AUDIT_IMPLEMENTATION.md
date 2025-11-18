# Security & Audit Logging Implementation

## Overview

This document describes the comprehensive security and audit logging system implemented for the Voting System. The system provides enterprise-grade action tracing, mutation locking, and cryptographic integrity verification for all admin operations.

## Architecture

### Components

1. **AdminAuditLogger** (`backend/utils/adminAuditLogger.js`)
   - Core utility class for all audit logging operations
   - Provides cryptographic signatures and hash verification
   - Handles security event classification
   - Integrates with MySQL database

2. **Database Migration** (`backend/migrations/002_add_admin_audit_logging.js`)
   - Creates audit logging tables
   - Adds mutation locking columns to elections and candidates
   - Establishes audit log views for analytics

3. **Enhanced Elections Routes** (`backend/routes/elections.js`)
   - Integrates audit logging into all admin operations
   - Implements mutation locking checks
   - Provides audit log retrieval endpoints

4. **Frontend Audit Viewer** (`frontend/src/components/AdminAuditLogs.vue`)
   - Vue 3 component for viewing and analyzing audit logs
   - Supports filtering and pagination
   - Allows integrity verification of audit entries

## Features

### 1. Comprehensive Audit Logging

Every admin action is logged with complete forensic details:

- **Admin Identity**: User ID who performed the action
- **Action Type**: Specific operation (CREATE_ELECTION, ADD_CANDIDATE, etc.)
- **Resource**: Type and ID of affected resource
- **Changes**: Full JSON payload of what was changed
- **Cryptographic Hash**: SHA256 hash of changes for integrity verification
- **Action Signature**: SHA256 signature of admin+action+timestamp
- **IP Address**: Source IP for forensic tracking
- **User Agent**: Browser/client identification
- **Timestamp**: UTC timestamp of action
- **Status**: Success or failed attempt with reason

### 2. Mutation Locking

Elections and candidates are protected from modification after election activation:

**Election Lifecycle:**
```
PENDING (Mutations allowed) 
  ↓
ACTIVE (Mutations locked) 
  ↓
COMPLETED
```

**Mutation Restrictions:**
- Cannot add candidates to active or locked elections
- Cannot delete candidates from active or locked elections
- Cannot modify election details once active
- Lock is automatic when election status changes to "active"

**Error Response** (403 Forbidden):
```json
{
  "message": "Cannot add candidate - election is locked or active"
}
```

### 3. Security Event Logging

Sensitive operations are tracked with severity levels:

**Severity Levels:**
- `LOW`: Informational events (election created, candidate added)
- `MEDIUM`: Important changes (election activated, candidate deleted)
- `HIGH`: Unusual activity (mutation attempt on locked election)
- `CRITICAL`: Security violations (unauthorized access attempts)

### 4. Audit Log Verification

Admin can verify the integrity of audit logs to detect tampering:

**Verification Process:**
1. Retrieve stored change_hash from database
2. Recalculate SHA256 hash of changes
3. Compare hashes
4. Return verification result

**API Response:**
```json
{
  "valid": true,
  "reason": "Hash matches - log integrity verified"
}
```

## Database Schema

### admin_audit_logs Table

```sql
CREATE TABLE admin_audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INT,
  changes JSON,
  change_hash VARCHAR(64),
  action_signature VARCHAR(64),
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSON,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('success', 'failed') DEFAULT 'success',
  verified BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_action_type (action_type),
  INDEX idx_resource_type (resource_type),
  INDEX idx_timestamp (timestamp)
);
```

### admin_security_logs Table

```sql
CREATE TABLE admin_security_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
  description TEXT,
  metadata JSON,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by INT,
  
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_event_type (event_type),
  INDEX idx_severity (severity),
  INDEX idx_timestamp (timestamp)
);
```

### elections Table (Modified)

New columns added:
```sql
ALTER TABLE elections ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE elections ADD COLUMN locked_at DATETIME;
ALTER TABLE elections ADD COLUMN locked_by INT;
```

### candidates Table (Modified)

New columns added:
```sql
ALTER TABLE candidates ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE candidates ADD COLUMN locked_at DATETIME;
```

## API Endpoints

### 1. Create Election (Enhanced)
**Endpoint:** `POST /api/elections`
**Authorization:** Admin required

**Request:**
```json
{
  "title": "2024 Presidential Election",
  "description": "Annual presidential election",
  "startDate": "2024-01-15",
  "endDate": "2024-01-20",
  "candidates": [
    { "name": "John Doe", "description": "Candidate A" },
    { "name": "Jane Smith", "description": "Candidate B" }
  ]
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "title": "2024 Presidential Election",
  "status": "pending",
  "is_locked": false,
  "candidates": [...]
}
```

**Logging:**
- Records admin action with all candidate details
- Logs security event for election creation
- Stores IP address and user agent

### 2. Lock Election
**Endpoint:** `PATCH /api/elections/:id/lock`
**Authorization:** Admin required

**Response (200 OK):**
```json
{
  "message": "Election locked successfully",
  "electionId": 1,
  "lockedAt": "2024-01-15T10:30:00Z",
  "lockedBy": 5
}
```

**Logging:**
- Records lock action
- Logs security event with HIGH severity
- Locks all candidates for the election

### 3. Add Candidate (Protected)
**Endpoint:** `POST /api/elections/:id/candidates`
**Authorization:** Admin required

**Request:**
```json
{
  "name": "New Candidate",
  "description": "Candidate description"
}
```

**Response (201 Created):**
```json
{
  "id": 10,
  "name": "New Candidate",
  "election_id": 1
}
```

**Response (403 Forbidden) - Election Locked:**
```json
{
  "message": "Cannot add candidate - election is locked or active"
}
```

**Logging:**
- Success: Records add candidate action
- Failure: Logs failed action attempt with reason
- Logs security event if unauthorized mutation attempted

### 4. Delete Candidate (Protected)
**Endpoint:** `DELETE /api/elections/:electionId/candidates/:candidateId`
**Authorization:** Admin required

**Response (200 OK):**
```json
{
  "message": "Candidate deleted successfully"
}
```

**Response (403 Forbidden) - Election Locked:**
```json
{
  "message": "Cannot delete candidate - election is locked or active"
}
```

**Logging:**
- Success: Records delete candidate action
- Failure: Logs HIGH severity security event for bypass attempt

### 5. Get Audit Logs
**Endpoint:** `GET /api/admin/audit-logs?limit=20&offset=0`
**Authorization:** Admin required

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "admin_id": 5,
    "action_type": "CREATE_ELECTION",
    "resource_type": "elections",
    "resource_id": 1,
    "changes": {
      "title": "2024 Election",
      "candidates": [...]
    },
    "change_hash": "a7f3c9...",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "timestamp": "2024-01-15T10:00:00Z",
    "status": "success"
  },
  ...
]
```

### 6. Get Security Logs
**Endpoint:** `GET /api/admin/security-logs`
**Authorization:** Admin required

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "admin_id": 5,
    "event_type": "UNAUTHORIZED_MUTATION_ATTEMPT",
    "severity": "HIGH",
    "description": "Attempt to add candidate to locked election #1",
    "timestamp": "2024-01-15T10:15:00Z",
    "acknowledged": false
  },
  ...
]
```

### 7. Verify Audit Integrity
**Endpoint:** `POST /api/admin/verify-audit-integrity/:logId`
**Authorization:** Admin required

**Response (200 OK):**
```json
{
  "valid": true,
  "reason": "Hash matches - log integrity verified",
  "logId": 1,
  "storedHash": "a7f3c9...",
  "calculatedHash": "a7f3c9..."
}
```

**Response (200 OK) - Tampering Detected:**
```json
{
  "valid": false,
  "reason": "Hash mismatch - log may have been tampered with",
  "logId": 1,
  "storedHash": "a7f3c9...",
  "calculatedHash": "b8g4d0..."
}
```

## AdminAuditLogger Class

### Methods

#### logAdminAction()
Logs successful admin operations.

```javascript
await adminLogger.logAdminAction(
  adminId,           // User ID
  'CREATE_ELECTION', // Action type
  'elections',       // Resource type
  1,                 // Resource ID
  {                  // Changes object
    title: 'Election 2024',
    candidates: [...]
  },
  {                  // Metadata
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...'
  }
);
```

#### logFailedAction()
Logs failed mutation attempts.

```javascript
await adminLogger.logFailedAction(
  adminId,
  'ADD_CANDIDATE',
  'candidates',
  null,
  'Cannot add candidate - election is locked',
  {
    electionId: 1,
    status: 'active',
    ipAddress: '192.168.1.100'
  }
);
```

#### logSecurityEvent()
Logs security-sensitive operations.

```javascript
await adminLogger.logSecurityEvent(
  adminId,
  'UNAUTHORIZED_MUTATION_ATTEMPT',
  'HIGH',  // Severity: LOW, MEDIUM, HIGH, CRITICAL
  'Attempt to add candidate to locked election #1',
  {
    electionId: 1,
    reason: 'Election is active'
  }
);
```

#### getAdminLogs()
Retrieves audit logs with optional filtering.

```javascript
const logs = await adminLogger.getAdminLogs(
  adminId,  // Optional: filter by admin
  limit,    // Optional: pagination limit
  offset    // Optional: pagination offset
);
```

#### verifyAuditIntegrity()
Verifies hash integrity of an audit entry.

```javascript
const result = await adminLogger.verifyAuditIntegrity(logId);
// Returns: { valid: boolean, reason: string }
```

## Frontend Audit Viewer

### Features

The `AdminAuditLogs.vue` component provides:

1. **Audit Log Display**
   - Shows all admin actions with complete details
   - Displays timestamp, action type, resource, and status
   - Shows IP address and changes made

2. **Filtering**
   - Filter by action type
   - Filter by status (success/failed)
   - Real-time filtering without reload

3. **Verification**
   - One-click integrity verification
   - Shows hash match/mismatch results
   - Detects potential tampering

4. **Pagination**
   - Browse through large logs efficiently
   - Configurable page size
   - Previous/Next navigation

### Usage

Add to any admin view:

```vue
<template>
  <AdminAuditLogs />
</template>

<script>
import AdminAuditLogs from '@/components/AdminAuditLogs.vue'

export default {
  components: {
    AdminAuditLogs
  }
}
</script>
```

## Security Best Practices

1. **Always Verify Hash Integrity**
   - Regularly verify audit logs for tampering
   - Use the verification API endpoint
   - Monitor HIGH and CRITICAL security events

2. **Regular Log Review**
   - Review audit logs weekly
   - Monitor for unauthorized mutation attempts
   - Check IP addresses for unusual access patterns

3. **Keep Audit Logs Secure**
   - Restrict access to audit logs (admin only)
   - Implement regular backups
   - Consider off-site archival for compliance

4. **Monitor Security Events**
   - Set up alerts for HIGH/CRITICAL events
   - Investigate unauthorized mutation attempts
   - Review patterns for anomalies

5. **Mutation Locking**
   - Understand that elections become immutable once active
   - Plan candidate list before activation
   - Document election status changes

## Deployment Steps

### 1. Execute Database Migration
```bash
cd backend
node migrations/002_add_admin_audit_logging.js
```

This will:
- Create `admin_audit_logs` table
- Create `admin_security_logs` table
- Add columns to `elections` table
- Add columns to `candidates` table
- Create analytics view

### 2. Deploy Backend Changes
```bash
# Update elections.js route with new endpoints
# Update or create adminAuditLogger.js utility
# Restart backend service
npm restart
```

### 3. Deploy Frontend Changes
```bash
# Add AdminAuditLogs.vue component
# Update AdminDashboard.vue to include audit logs tab
# Rebuild frontend
npm run build
```

### 4. Verify Deployment
```bash
# Check audit tables created
mysql -u root -p voting -e "DESCRIBE admin_audit_logs;"
mysql -u root -p voting -e "DESCRIBE admin_security_logs;"

# Test endpoints
curl -X GET http://localhost:3000/api/admin/audit-logs \
  -H "Authorization: Bearer $TOKEN"
```

## Testing

### Test Scenarios

#### 1. Election Creation Logging
```
1. Create new election as admin
2. Check admin_audit_logs for CREATE_ELECTION entry
3. Verify all candidate details in changes field
4. Confirm IP and user-agent captured
```

#### 2. Mutation Locking
```
1. Create election
2. Activate election
3. Attempt to add candidate
4. Verify 403 Forbidden response
5. Check audit log for failed action
6. Verify HIGH severity security event logged
```

#### 3. Integrity Verification
```
1. Get audit log ID
2. Call verify endpoint
3. Confirm hash match message
4. Modify log in database (test only)
5. Call verify again
6. Confirm hash mismatch detected
```

#### 4. Audit Log Retrieval
```
1. Create multiple elections/candidates
2. Retrieve audit logs with filters
3. Test pagination
4. Verify all details displayed correctly
```

## Monitoring & Compliance

### Audit Log Retention
- Keep audit logs for minimum 1 year
- Archive logs older than 6 months
- Maintain secure backups

### Compliance
- Logs contain all elements required by audit standards
- Cryptographic signatures enable non-repudiation
- Hash verification ensures log integrity

### Reporting
Generate compliance reports:
- Admin activity summaries
- Security event trends
- Mutation lock enforcement verification

## Troubleshooting

### Issue: Audit logs not created
**Solution:**
- Verify migration executed successfully
- Check database tables exist
- Verify adminLogger instance initialized
- Check database connection

### Issue: Hash verification fails
**Solution:**
- Ensure changes JSON not modified in database
- Verify hash algorithm consistency
- Check timestamp included in hash calculation

### Issue: Mutation locking not enforced
**Solution:**
- Verify is_locked column exists
- Check election status before mutation check
- Verify response code is 403
- Check logging for failed attempts

## Future Enhancements

1. **Real-time Alerts**
   - WebSocket notifications for security events
   - Immediate alerts for HIGH/CRITICAL events

2. **Audit Log Export**
   - Export to CSV/PDF for compliance
   - Batch export functionality

3. **Anomaly Detection**
   - ML-based unusual activity detection
   - Automated security event classification

4. **Advanced Filtering**
   - Date range filtering
   - Advanced search capabilities
   - Custom report generation

5. **Audit Dashboard**
   - Visual timeline of admin actions
   - Security event heatmap
   - Admin activity metrics
