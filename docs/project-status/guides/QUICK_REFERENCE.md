# Security & Audit Logging - Quick Reference Guide

## 🚀 Quick Start (5 Minutes)

### 1. Execute Database Migration

```bash
cd backend
node migrations/002_add_admin_audit_logging.js
```

Expected: "Migration completed successfully"

### 2. Restart Backend

```bash
docker restart voting-backend
# OR
npm restart
```

### 3. Test in Frontend

- Open Admin Dashboard
- Click "🔐 Audit Logs" tab
- Should see log entries for past actions

## 📋 Key Files

| File                                                         | Purpose              | Status     |
| ------------------------------------------------------------ | -------------------- | ---------- |
| `services/backend/utils/adminAuditLogger.js`                 | Core logging utility | ✅ Created |
| `services/backend/migrations/002_add_admin_audit_logging.js` | Database schema      | ✅ Created |
| `services/backend/routes/elections.js`                       | Enhanced routes      | ✅ Updated |
| `services/frontend/src/components/AdminAuditLogs.vue`        | Log viewer           | ✅ Created |
| `services/frontend/src/views/AdminDashboard.vue`             | Admin panel          | ✅ Updated |

## 🔐 Core Features

### 1. Mutation Locking

```text
Election Status    Candidate Actions
─────────────────  ────────────────
PENDING            ✅ Add/Delete allowed
ACTIVE             ❌ Add/Delete blocked
COMPLETED          ❌ Add/Delete blocked
```

### 2. Audit Logging

Every action logged with:

- ✅ Admin ID (who)
- ✅ Action type (what)
- ✅ Changes (changes)
- ✅ IP address (where)
- ✅ Timestamp (when)
- ✅ Hash signature (proof)

### 3. Security Events

Logged with severity:

- 🔵 LOW: Informational
- 🟡 MEDIUM: Important
- 🔴 HIGH: Unusual activity
- ⚫ CRITICAL: Violations

## 🧪 Quick Test

### Test 1: Create & Log

```text
1. Admin Dashboard → Create Election
2. Fill details and submit
3. Go to Audit Logs tab
4. Should see CREATE_ELECTION entry
```

### Test 2: Mutation Lock

```text
1. Activate election (set status to "active")
2. Try to add candidate
3. Should get error: "Cannot add candidate"
4. Check Audit Logs for failed attempt
```

### Test 3: Verify Integrity

```text
1. Audit Logs tab
2. Click "Verify" on any log
3. Should show "✓ Hash matches"
```

## 📊 Admin Audit Logs Tab

**Filters:**

- Action Type: CREATE_ELECTION, ADD_CANDIDATE, DELETE_CANDIDATE, etc.
- Status: Success or Failed

**Actions:**

- Verify: Check hash integrity
- Pagination: Browse through logs
- Filter: Find specific events

## 🔗 API Endpoints

### Get Audit Logs

```bash
curl http://localhost:3000/api/admin/audit-logs \
  -H "Authorization: Bearer TOKEN"
```

### Get Security Logs

```bash
curl http://localhost:3000/api/admin/security-logs \
  -H "Authorization: Bearer TOKEN"
```

### Verify Log Integrity

```bash
curl -X POST http://localhost:3000/api/admin/verify-audit-integrity/1 \
  -H "Authorization: Bearer TOKEN"
```

### Add Candidate (Protected)

```bash
curl -X POST http://localhost:3000/api/elections/1/candidates \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "description": "Candidate"}'
```

Will return 403 if election is locked/active.

## ⚠️ Common Issues

### Issue: Audit Logs tab not showing

**Fix:**

```bash
# Hard refresh browser
Ctrl+Shift+R

# Or rebuild frontend
cd frontend && npm run build
```

### Issue: Cannot add candidate - but election not active

**Fix:**

- Check election `is_locked` column in database
- Verify election status is "pending"
- Check database: `SELECT is_locked, status FROM elections WHERE id=1;`

### Issue: No logs appearing

**Fix:**

```bash
# Check migration ran
mysql -u root -p voting -e "SHOW TABLES LIKE 'admin%';"

# Should show:
# admin_audit_logs
# admin_security_logs
```

### Issue: Hash verification fails

**Fix:**

- Ensure no modifications to audit log in database
- Verify hash algorithm is SHA256
- Check changes JSON is valid

## 📈 Monitoring

### Weekly Check

1. Review audit logs
2. Look for HIGH/CRITICAL events
3. Check for unusual IP addresses
4. Verify no failed mutations

### Database Health

```sql
-- Check table sizes
SELECT
  'admin_audit_logs' as table_name,
  ROUND((data_length+index_length)/1024/1024, 2) as size_mb
FROM information_schema.tables
WHERE table_name IN ('admin_audit_logs', 'admin_security_logs');

-- Count recent entries
SELECT COUNT(*) FROM admin_audit_logs WHERE DATE(created_at) = CURDATE();
```

## 🔄 Workflow

### Creating Election

```text
1. Admin fills election form
2. Clicks "Create Election"
3. System:
   - Creates election (is_locked=false)
   - Creates candidates
   - Logs CREATE_ELECTION to audit_logs
   - Logs security event
   - Returns success
4. Admin sees log entry in Audit Logs tab
```

### Activating Election

```text
1. Admin selects election
2. Clicks "Activate"
3. System:
   - Changes status to "active"
   - Sets is_locked=true
   - Locks all candidates
   - Logs security event
4. Mutation attempts now return 403
```

### Adding Candidate (After Activation)

```text
1. Admin tries to add candidate
2. System checks:
   - Is election locked? YES
   - Return 403 error
3. Logs failed attempt + HIGH security event
4. Admin sees error message
```

## 📚 Documentation

### Comprehensive Guides

- **SECURITY_AUDIT_IMPLEMENTATION.md** - Full technical documentation
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment
- **SECURITY_IMPLEMENTATION_SUMMARY.md** - Complete overview

### Code Comments

- Each method documented
- Parameters explained
- Return values specified

## ✅ Verification Checklist

- [ ] Migration executed successfully
- [ ] admin_audit_logs table exists
- [ ] admin_security_logs table exists
- [ ] elections table has is_locked column
- [ ] Audit Logs tab visible in AdminDashboard
- [ ] Can create election and see audit log
- [ ] Cannot add candidate after election activation
- [ ] Hash verification works
- [ ] No JavaScript errors in console
- [ ] Backend logs show no errors

## 🎯 Success Indicators

System is working when:

- ✅ Audit logs appear immediately after actions
- ✅ Failed mutations return 403 and log event
- ✅ Hash verification shows "integrity verified"
- ✅ Security events have correct severity
- ✅ Frontend displays all details correctly
- ✅ No errors in logs or console

## 🚨 Emergency Procedures

### If Mutation Lock Broken

```sql
-- Manual unlock (emergency only)
UPDATE elections SET is_locked=0 WHERE id=1;
-- Then restart backend
```

### If Logs Not Creating

```bash
# Check adminLogger initialized
grep -n "new AdminAuditLogger" services/backend/routes/elections.js

# Verify database connection
mysql -u root -p voting -e "SELECT 1;"

# Check backend logs
docker logs voting-backend
```

### If Migration Failed

```bash
# Check error message
mysql -u root -p voting -e "DESCRIBE admin_audit_logs;"

# If table exists, migration already ran
# If table doesn't exist, run migration again
node services/backend/migrations/002_add_admin_audit_logging.js
```

## 📞 Support Resources

### Quick Commands

```bash
# Check backend status
curl http://localhost:3000/api/elections -H "Authorization: Bearer TOKEN"

# Check database connection
mysql -u root -p -e "SELECT VERSION();"

# View recent logs
docker logs voting-backend --tail=50

# Restart system
docker-compose restart
```

### Testing Endpoints

```bash
# Get audit logs
curl "http://localhost:3000/api/admin/audit-logs?limit=5" \
  -H "Authorization: Bearer TOKEN"

# Verify specific log
curl -X POST "http://localhost:3000/api/admin/verify-audit-integrity/1" \
  -H "Authorization: Bearer TOKEN"
```

---

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Ready for Production ✅
