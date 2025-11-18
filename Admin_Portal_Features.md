# Admin Portal Features

## Overview

The Admin Portal is a comprehensive management interface for administrators to create, manage, and monitor elections. It provides full control over the voting system with real-time statistics and analytics.

**Access:** `/admin/dashboard` (Admin role required)

---

## Features

### 1. Elections Management

#### View All Elections
- **Table Display** showing:
  - Election Title
  - Current Status (Active/Pending/Completed)
  - Start & End Dates
  - Number of Candidates
  - Total Votes Received
  - Action Buttons

#### Election Actions
- **Edit Election** - Modify election details
- **Activate/Deactivate** - Control election voting status
- **Delete Election** - Remove election and all related data

#### Status Management
- **Pending** - Not yet open for voting
- **Active** - Open for voting (voters can participate)
- **Completed** - Voting has ended

---

### 2. Create New Election

#### Election Form Fields
- **Title** (required) - Election name
- **Description** - Election details and context
- **Start Date & Time** (required) - When voting begins
- **End Date & Time** (required) - When voting ends
- **Candidates** (required) - Add multiple candidates

#### Candidate Management While Creating
- Add candidate name and description
- Dynamically add/remove candidates
- Minimum 1 candidate required
- No maximum limit

#### Election Creation
- Generates unique cryptographic keys for vote encryption
- Auto-sets status to "pending" (requires activation)
- Real-time validation of dates and fields
- Success confirmation with election details

---

### 3. Manage Candidates

#### Select Election
- Dropdown to choose an election
- View all candidates for selected election

#### Candidate Details
- Candidate name and description
- Vote count for each candidate
- Delete individual candidates

#### Add Candidates to Existing Elections
- Quick form to add new candidates
- Candidate name and description fields
- Add candidate without recreating election

#### Candidate Removal
- Remove candidates from any election
- Cascading deletion of associated data

---

### 4. Results & Statistics

#### Election Selection
- Dropdown showing all elections
- Display vote count in selection

#### Vote Overview Cards
- **Total Votes** - Total votes cast in election
- **Registered Voters** - Total eligible voters
- **Participation Rate** - Percentage of registered voters who voted

#### Vote Distribution Chart
- **Candidate Rankings** - Numbered by votes received
- **Vote Count** - Exact number of votes per candidate
- **Visual Bar Charts** - Proportional vote distribution
- **Percentage Display** - Vote percentage per candidate

#### Real-Time Statistics
- Auto-updating vote counts
- Live participation calculations
- Instant ranking changes as votes come in

---

### 5. Audit Logs (NEW)

#### Complete Audit Trail
- **All Admin Actions Logged** - Every action tracked with complete details
  - Who performed the action (Admin ID)
  - What action was performed (CREATE_ELECTION, ADD_CANDIDATE, DELETE_CANDIDATE, etc.)
  - When it happened (UTC timestamp)
  - Where from (Source IP address)
  - What client (User-agent/browser info)
  - What changed (Full JSON payload of changes)
  - Action status (Success or failed)

#### Action Logging Details
- **Successful Actions** - Recorded with complete change payload
- **Failed Attempts** - Logged with detailed reason for failure
- **Cryptographic Signatures** - SHA256 hash of changes for integrity
- **Security Events** - Classified by severity (LOW, MEDIUM, HIGH, CRITICAL)

#### Audit Log Filtering
- **Filter by Action Type:**
  - CREATE_ELECTION
  - ADD_CANDIDATE
  - DELETE_CANDIDATE
  - ACTIVATE_ELECTION
  - DEACTIVATE_ELECTION
  - LOCK_ELECTION
  - DELETE_ELECTION
- **Filter by Status:** Success or Failed attempts
- **Real-Time Filtering** - No page reload required

#### Audit Log Display
- **Timestamp** - When action occurred
- **Action Type** - What operation was performed
- **Resource** - Which election/candidate affected
- **Status Badge** - Visual success/failure indicator
- **IP Address** - Source of the action
- **Changes** - JSON preview of what changed
- **Hash Signature** - Cryptographic proof of integrity

#### Integrity Verification
- **One-Click Verification** - Verify button on each log entry
- **Hash Matching** - SHA256 hash validation
- **Tamper Detection** - Identifies if logs were modified
- **Success Indicator** - "✓ Hash matches - integrity verified"
- **Failure Alert** - "✗ Hash mismatch - log may have been tampered with"

#### Pagination
- **Page Navigation** - Previous/Next buttons
- **Page Display** - Shows current page and total pages
- **Configurable Size** - Load logs efficiently

---

### 6. Mutation Locking (Security Feature)

#### Election Status Protection
- **Pending Elections** - ✅ Candidates can be added/deleted
- **Active Elections** - ❌ Candidates CANNOT be added/deleted (locked)
- **Completed Elections** - ❌ No mutations allowed

#### Automatic Locking
- **Lock Triggers:** When election status changes to "active"
- **Automatic Application:** All candidates locked simultaneously
- **Enforcement:** Mutation attempts return 403 Forbidden error

#### Mutation Lock Error
```
Error Message: "Cannot add candidate - election is locked or active"
HTTP Status: 403 Forbidden
Action: Logged as failed attempt with HIGH severity security event
```

#### Security Implications
- **Prevents Data Tampering** - No unauthorized changes after voting starts
- **Maintains Election Integrity** - Candidate list frozen during voting
- **Audit Trail** - All bypass attempts logged as security violations
- **Non-Repudiation** - Cryptographic signatures prevent denial

#### Planning Requirement
- **Add All Candidates Before Activation** - Cannot add candidates after election starts
- **Candidate Verification** - Ensure all candidates added and correct before activation
- **No Late Additions** - Once active, election is immutable

---

## User Interface

### Navigation Tabs
- **📋 Elections** - View and manage all elections
- **➕ Create Election** - Create new elections with candidates
- **👥 Manage Candidates** - Add/remove candidates from elections
- **📈 Results & Stats** - View real-time voting statistics
- **🔐 Audit Logs** - View and verify all admin actions (NEW)

### Status Badge Colors
- 🟢 **Active** - Green (election is open)
- 🟡 **Pending** - Yellow (waiting to start)
- 🔵 **Completed** - Blue (voting ended)
- ✅ **Success** - Green (in audit logs)
- ❌ **Failed** - Red (in audit logs)

### Buttons & Actions
- **Primary Actions** - Create, Update (Blue)
- **Warning Actions** - Activate/Deactivate (Orange)
- **Danger Actions** - Delete (Red)
- **Secondary Actions** - Cancel, Reset (Gray)
- **Verify Button** - Check hash integrity (Audit Logs)

### Responsiveness
- Desktop-optimized layout
- Tablet-friendly interface
- Mobile adaptable design
- Responsive tables with pagination

---

## Security & Access Control

### Authentication
- **Admin-Only Access** - Requires admin role
- **JWT Token Verification** - Validates authorization
- **Auto-Redirect** - Non-admins redirected to home page
- **Session Protection** - Logout option available

### Data Protection
- Election data isolated by admin
- Vote integrity maintained
- Cryptographic keys generated securely
- All changes logged for audit

### Mutation Locking
- **Election Immutability** - Elections locked after activation
- **Automatic Protection** - Candidates cannot be modified when election is active
- **Authorization Checks** - 403 Forbidden on unauthorized mutations
- **Forensic Logging** - Bypass attempts logged as security violations

### Audit Trail Security
- **SHA256 Hashing** - Cryptographic integrity of all logs
- **Action Signatures** - Non-repudiation through signatures
- **Tamper Detection** - Verify logs haven't been modified
- **Complete Forensics** - IP tracking, user-agent logging, timestamps
- **Security Events** - Classified by severity (LOW, MEDIUM, HIGH, CRITICAL)

---

## Backend Integration

### API Endpoints

#### Get Elections (Admin)
```
GET /api/elections/admin/all
Authorization: Bearer <admin_token>
```
Returns all elections with statistics and candidates

#### Create Election
```
POST /api/elections
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Election Title",
  "description": "Description",
  "startDate": "2025-11-20T00:00:00Z",
  "endDate": "2025-11-27T23:59:59Z",
  "candidates": [
    { "name": "Candidate 1", "description": "..." },
    { "name": "Candidate 2", "description": "..." }
  ]
}
```

#### Update Election Status
```
PATCH /api/elections/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "status": "active" }
```

#### Delete Election
```
DELETE /api/elections/:id
Authorization: Bearer <admin_token>
```

#### Add Candidate
```
POST /api/elections/:id/candidates
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "name": "Candidate Name", "description": "..." }
```

#### Delete Candidate
```
DELETE /api/elections/:electionId/candidates/:candidateId
Authorization: Bearer <admin_token>
```

#### Get Audit Logs
```
GET /api/admin/audit-logs?limit=20&offset=0
Authorization: Bearer <admin_token>
```
Returns paginated list of all audit log entries

#### Get Security Logs
```
GET /api/admin/security-logs
Authorization: Bearer <admin_token>
```
Returns all security events with severity levels

#### Verify Audit Integrity
```
POST /api/admin/verify-audit-integrity/:logId
Authorization: Bearer <admin_token>
```
Returns hash verification result (valid/invalid)

#### Lock Election
```
PATCH /api/elections/:id/lock
Authorization: Bearer <admin_token>
```
Manually lock election to prevent mutations

---

## Workflow Examples

### Creating an Election (With Audit Logging)

1. **Navigate** to Admin Dashboard → Create Election tab
2. **Fill Form:**
   - Title: "Student Council President 2025"
   - Description: "Vote for next student council president"
   - Start Date: Nov 20, 2025 at 10:00 AM
   - End Date: Nov 27, 2025 at 5:00 PM
3. **Add ALL Candidates Before Activation:**
   - Alice Johnson (Computer Science major)
   - Bob Smith (Business major)
   - Charlie Brown (Engineering student)
   - ⚠️ NOTE: Cannot add/delete candidates after election starts!
4. **Submit** - Election created in "Pending" status
   - ✅ Action logged in Audit Logs (CREATE_ELECTION)
5. **Verify in Audit Logs:**
   - Go to Audit Logs tab
   - See CREATE_ELECTION entry with all candidate details
   - Hash shows integrity verified ✓
6. **Activate** - Go to Elections tab, click "Activate"
   - ✅ Election locked automatically (is_locked = true)
   - ✅ Security event logged
7. **Voting Opens** - Students can now vote
   - ❌ Cannot add/delete candidates anymore

### Managing an Active Election (Mutation Locked)

1. **View Results** - Go to Results & Statistics tab
2. **Monitor Votes** - See real-time vote counts
3. **Check Participation** - View participation percentage
4. **Attempt to Add Candidate** - Will get error:
   ```
   Error: "Cannot add candidate - election is locked or active"
   Status: 403 Forbidden
   ```
5. **Check Audit Logs:**
   - Go to Audit Logs tab
   - Filter by Action: "ADD_CANDIDATE"
   - See failed attempt with "Failed" status
   - Security event logged with HIGH severity
6. **Deactivate** - Stop voting by deactivating election

### After Election Ends (Review & Compliance)

1. **View Final Results** - See complete vote distribution
2. **Export Data** - Final vote counts and statistics
3. **Archive Election** - Election status shows "Completed"
4. **Review Audit Trail:**
   - Go to Audit Logs tab
   - Review all admin actions for this election
   - Verify integrity of all logs
   - Download for compliance records
5. **Create Report** - Use vote percentages and audit trail for documentation

---

## Key Features Summary

| Feature | Description | Status |
|---------|-------------|--------|
| Create Elections | Full election creation with candidates | ✅ |
| Edit Elections | Modify election details | ✅ |
| Manage Candidates | Add/remove candidates dynamically | ✅ |
| Activate Elections | Control voting availability | ✅ |
| Mutation Locking | Elections immutable after activation | ✅ |
| Audit Logging | Complete action trail for all admins | ✅ |
| Security Events | Classify and track security operations | ✅ |
| Integrity Verification | SHA256 hash verification for logs | ✅ |
| Real-Time Results | Live vote counting and statistics | ✅ |
| Vote Analytics | Participation rates and distributions | ✅ |
| Status Management | Pending/Active/Completed states | ✅ |
| Audit Logs Tab | View and filter all admin actions | ✅ |
| Security | Admin-only access + mutation locking | ✅ |
| Data Integrity | Cascading deletions and validation | ✅ |
| Forensic Tracking | IP, user-agent, timestamp logging | ✅ |
| UI/UX | Responsive and intuitive interface | ✅ |

---

## Technical Details

### Frontend Components
- **AdminDashboard.vue** - Main admin interface with 5 tabs
- **AdminAuditLogs.vue** - New audit log viewer component (NEW)
- Vue 3 with Composition API ready
- Axios for API communication
- Responsive CSS Grid layout
- Filtering and pagination support

### Backend Routes
- `elections.js` - All election management routes with audit logging
- `adminAuditLogger.js` - Cryptographic audit logging utility (NEW)
- Admin authentication middleware
- Role-based access control
- Database transaction support
- Mutation locking enforcement

### Database Tables Used
- `elections` - Election master data (now with is_locked, locked_at, locked_by)
- `candidates` - Candidate information (now with is_locked, locked_at)
- `admin_audit_logs` - All admin action records (NEW)
- `admin_security_logs` - Security event tracking (NEW)
- `votes_meta` - Vote records
- `voter_registrations` - Voter eligibility

---

## Recently Deployed (v1.0)

- ✅ 🔐 Comprehensive audit logging system
- ✅ 🔒 Mutation locking for elections
- ✅ 📋 Audit logs tab with filtering and pagination
- ✅ ✔️ Hash integrity verification
- ✅ 🚨 Security event tracking with severity levels
- ✅ 📍 Forensic tracking (IP, user-agent, timestamps)
- ✅ 📝 AdminAuditLogger utility with cryptographic signatures

## Future Enhancements

- 📊 Advanced analytics dashboard
- 📥 CSV/Excel export functionality (including audit logs)
- 🔔 Email notifications for security events
- 🔔 Real-time alerts for HIGH/CRITICAL security events
- 📋 Bulk candidate import
- 🔍 Advanced search and filtering for audit logs
- 📝 Election templates for recurring events
- 🎯 Custom result rules (majority, plurality, etc.)
- 📱 Mobile admin app
- 📊 Automated compliance reports
- 🔄 Log archival and retention policies
- 📈 Security event dashboards and trends

---

## Important Notes

### Mutation Locking ⚠️
**CRITICAL:** All candidates must be added BEFORE activating an election. Once activated:
- ❌ Cannot add new candidates
- ❌ Cannot delete existing candidates
- ✅ Can only view results and manage election status

This is by design to maintain election integrity during voting.

### Audit Logging & Compliance 📋
- All admin actions are automatically logged
- Failed attempts are recorded as security events
- All logs can be verified for integrity
- Logs should be reviewed weekly for security monitoring
- Implement retention policy (minimum 1 year recommended)

## Support

For admin portal issues or questions:
- Check browser console for errors
- Verify admin role assignment
- Ensure API endpoints are accessible
- Check authentication token validity
- Review audit logs for failed action details
- Verify hash integrity if logs seem suspicious

For documentation:
- See **QUICK_REFERENCE.md** for 5-minute quick start
- See **SECURITY_AUDIT_IMPLEMENTATION.md** for technical details
- See **DEPLOYMENT_CHECKLIST.md** for deployment procedures

