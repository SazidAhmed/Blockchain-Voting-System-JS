# Security Implementation Deployment Checklist

## Pre-Deployment Review

### Code Review ✅
- [x] AdminAuditLogger.js created with cryptographic integrity
- [x] Database migration script created
- [x] Elections.js updated with security endpoints
- [x] AdminAuditLogs.vue component created
- [x] AdminDashboard.vue updated with audit logs tab
- [x] All code changes committed to git

### Documentation ✅
- [x] SECURITY_AUDIT_IMPLEMENTATION.md created
- [x] API endpoints documented
- [x] Database schema documented
- [x] Security features explained

## Deployment Steps

### Step 1: Database Migration (CRITICAL)
```bash
# Navigate to backend directory
cd backend

# Execute migration to create audit tables
node migrations/002_add_admin_audit_logging.js

# Verify tables were created
mysql -u root -p voting -e "DESCRIBE admin_audit_logs; DESCRIBE admin_security_logs;"
```

**Expected Output:**
- admin_audit_logs table created with 14 columns
- admin_security_logs table created with 10 columns
- Indexes created for performance
- elections table modified with 3 new columns
- candidates table modified with 2 new columns

**Troubleshooting:**
- If "table already exists" error: Migration already ran
- If "connection refused": Ensure MySQL is running
- If "access denied": Check MySQL credentials in migration file

### Step 2: Backend Service Restart
```bash
# Option 1: Docker (if using containers)
docker restart voting-backend

# Option 2: Direct Node.js
npm restart

# Option 3: Kill and restart
kill $(lsof -t -i:3000)
npm start
```

**Verification:**
```bash
# Check backend is running
curl -X GET http://localhost:3000/api/elections/admin \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return elections array (may be empty, but no error)
```

### Step 3: Frontend Build & Deploy
```bash
cd frontend

# Install dependencies if needed
npm install

# Build production version
npm run build

# Start development server (for testing)
npm run dev
```

**Expected Result:**
- No build errors
- Frontend accessible at http://localhost:5173 (dev) or configured production URL
- AdminDashboard loads with 5 tabs (including new Audit Logs tab)

## Testing the Implementation

### Test 1: Create Election and Log It
```bash
# 1. Navigate to Admin Dashboard
# 2. Go to "Create Election" tab
# 3. Fill in details:
#    - Title: "Test Election"
#    - Start Date: Tomorrow
#    - End Date: One week from now
#    - Candidates: Add 2-3 candidates
# 4. Click "Create Election"
# 5. Go to "Audit Logs" tab
# 6. Verify CREATE_ELECTION entry appears

Expected Fields:
- Resource: elections #1
- Status: success
- Changes: Contains full election and candidates details
- IP Address: 127.0.0.1 (localhost)
```

### Test 2: Verify Mutation Locking
```bash
# 1. From previous test, election should exist
# 2. Go to "Elections Management" tab
# 3. Activate the test election (change status to "active")
# 4. Go to "Manage Candidates" tab
# 5. Select the test election
# 6. Try to add a new candidate
# 7. Should get error: "Cannot add candidate - election is locked or active"
# 8. Go to "Audit Logs" tab
# 9. Verify:
#    - ADD_CANDIDATE entry with status: "failed"
#    - Two HIGH severity security events logged
```

### Test 3: Check Audit Log Details
```bash
# 1. Go to Admin Dashboard → Audit Logs tab
# 2. Click "Verify" button on any log entry
# 3. Should see popup: "✓ Audit log #X integrity verified - Hash matches"
# 4. Try with multiple entries
# 5. All should show hash match (no tampering)
```

### Test 4: Filter Audit Logs
```bash
# 1. Go to Audit Logs tab
# 2. Filter by Action: "CREATE_ELECTION"
# 3. Verify only CREATE_ELECTION entries appear
# 4. Filter by Status: "failed"
# 5. Verify only failed attempts appear
# 6. Reset filters - all logs show again
```

## Database Verification

### Check Tables Exist
```sql
-- Connect to MySQL
mysql -u root -p voting

-- List all tables
SHOW TABLES;

-- Should see:
-- admin_audit_logs
-- admin_security_logs
-- (and existing tables: users, elections, candidates, votes, etc.)
```

### Check Sample Log Entry
```sql
-- View recent audit log
SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 1;

-- Check columns are populated:
-- - admin_id: User who performed action
-- - action_type: CREATE_ELECTION, ADD_CANDIDATE, etc.
-- - changes: JSON with details
-- - change_hash: SHA256 hash
-- - ip_address: Client IP
-- - timestamp: Action timestamp
-- - status: 'success' or 'failed'
```

### Check Security Events
```sql
-- View recent security events
SELECT * FROM admin_security_logs ORDER BY timestamp DESC LIMIT 5;

-- Verify columns:
-- - event_type: Type of security event
-- - severity: LOW, MEDIUM, HIGH, CRITICAL
-- - description: Details of event
```

## API Testing

### Get Audit Logs
```bash
curl -X GET "http://localhost:3000/api/admin/audit-logs?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Expected: Array of audit log objects
```

### Get Security Logs
```bash
curl -X GET "http://localhost:3000/api/admin/security-logs" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Expected: Array of security event objects
```

### Verify Audit Integrity
```bash
curl -X POST "http://localhost:3000/api/admin/verify-audit-integrity/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Expected: 
# {
#   "valid": true,
#   "reason": "Hash matches - log integrity verified"
# }
```

## Troubleshooting

### Issue: Migration fails with "table already exists"
**Solution:**
- This is normal if running migration multiple times
- Tables are already created successfully
- You can safely ignore this error

### Issue: AdminAuditLogs tab not showing in dashboard
**Solution:**
```bash
# Check frontend build
npm run build

# Hard refresh browser (Ctrl+Shift+R)
# Check browser console for JavaScript errors (F12)
# Verify AdminDashboard.vue includes AdminAuditLogs component
```

### Issue: Audit logs not being created
**Troubleshooting Steps:**
```bash
# 1. Check backend logs
docker logs voting-backend  # or npm logs if running locally

# 2. Verify adminAuditLogger.js imported correctly
grep -n "require.*adminAuditLogger" backend/routes/elections.js

# 3. Check database connection
mysql -u root -p voting -e "SELECT COUNT(*) FROM admin_audit_logs;"

# 4. Create test election and check logs
# Go to Admin Dashboard > Create Election
# Then check database:
# mysql -u root -p voting -e "SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 1;"
```

### Issue: "Cannot add candidate - election is locked" not appearing
**Troubleshooting:**
```bash
# 1. Verify elections table has is_locked column
mysql -u root -p voting -e "DESCRIBE elections;" | grep is_locked

# 2. Check migration ran successfully
mysql -u root -p voting -e "SELECT id, is_locked, status FROM elections LIMIT 5;"

# 3. Verify elections.js has mutation checks
grep -n "is_locked.*election" backend/routes/elections.js

# 4. Restart backend
docker restart voting-backend  # or npm restart
```

## Post-Deployment Verification

### ✅ Checklist

- [ ] Database migration executed successfully
- [ ] All 5 admin dashboard tabs visible (including Audit Logs)
- [ ] Can create election and see log entry
- [ ] Can activate election
- [ ] Cannot add/delete candidates after election activation
- [ ] Security event logged for failed mutation attempt
- [ ] Can view audit logs with filters
- [ ] Can verify log integrity
- [ ] All API endpoints responding correctly
- [ ] No JavaScript errors in browser console

### Security Validation

- [ ] Verify that all admin actions create audit log entries
- [ ] Confirm IP addresses are captured correctly
- [ ] Check that hash verification works correctly
- [ ] Test filtering by action type and status
- [ ] Verify mutation locking prevents unauthorized changes

## Next Steps

1. **Review Audit Logs Regularly**
   - Check Audit Logs tab weekly
   - Monitor for HIGH/CRITICAL security events
   - Investigate failed mutation attempts

2. **Set Up Backups**
   - Backup audit_logs tables regularly
   - Implement retention policy
   - Consider off-site archival

3. **Monitor Performance**
   - Check database query performance
   - Add indexes if needed
   - Monitor disk space for growing logs

4. **Security Hardening**
   - Review and adjust severity levels for events
   - Consider additional logging for specific actions
   - Implement role-based access to audit logs

## Support

For issues or questions:
1. Check SECURITY_AUDIT_IMPLEMENTATION.md
2. Review database schema and audit tables
3. Check backend logs for errors
4. Verify all code files are in place
5. Test endpoints with curl commands above

## Success Indicators

✅ System is working correctly when:
- Audit logs appear immediately after admin actions
- Failed mutations show error message and log event
- Hash verification shows "integrity verified"
- Security events appear with correct severity levels
- Frontend displays all audit details correctly
- No errors in browser console or backend logs
