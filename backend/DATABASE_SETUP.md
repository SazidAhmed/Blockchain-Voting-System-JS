# Database Setup Guide

## Prerequisites

- MySQL 8.0 or higher installed
- Node.js 16+ installed
- Database credentials configured in `.env`

## Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=voting

# JWT Secret
JWT_SECRET=your_jwt_secret_here_change_in_production

# Blockchain Node
BLOCKCHAIN_NODE_URL=http://localhost:3001

# Server Port
PORT=3000
```

## Installation Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Create Database (Automatic)

The migration script will automatically create the database if it doesn't exist.

### Step 3: Run Migrations

Run all database migrations to create tables:

```bash
npm run migrate
```

Or manually:

```bash
node migrate.js run
```

**Expected Output:**
```
========================================
Database Migration Runner
========================================

✓ Connected to database: voting

Found 1 migration file(s)

→ Running migration: 001_initial_schema
  ✓ Successfully applied

========================================
Migration Summary
========================================
Total migrations: 1
Applied: 1
Skipped: 0

✓ All migrations completed successfully!
```

### Step 4: Verify Installation

Check migration status:

```bash
npm run migrate:status
```

Or:

```bash
node migrate.js status
```

**Expected Output:**
```
========================================
Migration Status
========================================

Available migrations:

✓ Applied  001_initial_schema
```

### Step 5: Verify Tables

Connect to MySQL and verify tables were created:

```bash
mysql -u root -p voting
```

```sql
SHOW TABLES;
```

**Expected Tables:**
- users
- elections
- candidates
- blind_tokens
- voter_registrations
- votes_meta
- vote_receipts
- nodes
- audit_logs
- threshold_key_shares
- tally_partial_decryptions
- system_config
- schema_migrations

## Database Schema Overview

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | Registered voters and administrators |
| `elections` | Election configurations and threshold keys |
| `candidates` | Candidates for each election |
| `blind_tokens` | Blind-signed eligibility tokens |
| `voter_registrations` | Voter registration tracking |
| `votes_meta` | On-chain vote metadata and nullifiers |
| `vote_receipts` | Cryptographic receipts for voters |

### Blockchain Network Tables

| Table | Purpose |
|-------|---------|
| `nodes` | Validator and observer nodes |
| `threshold_key_shares` | Key share metadata (shares in HSM) |
| `tally_partial_decryptions` | Partial decryptions for tallying |

### System Tables

| Table | Purpose |
|-------|---------|
| `audit_logs` | Tamper-evident audit trail |
| `system_config` | Global configuration |
| `schema_migrations` | Migration tracking |

## Common Operations

### Reset Database (Development Only)

**⚠️ WARNING: This will delete ALL data!**

```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS voting; CREATE DATABASE voting;"
npm run migrate
```

### Add Sample Data

Create a sample admin user:

```sql
INSERT INTO users 
  (institution_id, username, password, role, email, pseudonym_id, registration_status)
VALUES
  ('ADMIN001', 'admin', '$2a$10$XQHb5nJmYYKPQfWzMdYFyOQw3MxJYHk.zYhZ9yYd5xVvQzKgGFyZq', 
   'admin', 'admin@university.edu', SHA2('ADMIN001', 256), 'verified');
```

(Password is 'admin123' - **change in production!**)

### Check Database Status

```bash
# Count votes by election
mysql -u root -p voting -e "
SELECT e.title, COUNT(vm.id) as vote_count
FROM elections e
LEFT JOIN votes_meta vm ON e.id = vm.election_id
GROUP BY e.id, e.title;"

# Check node health
mysql -u root -p voting -e "SELECT * FROM v_node_health;"

# Recent audit events
mysql -u root -p voting -e "
SELECT event_type, user_id, timestamp 
FROM audit_logs 
ORDER BY timestamp DESC 
LIMIT 10;"
```

## Migration Management

### Creating New Migrations

1. Create a new SQL file in `backend/migrations/`:
   ```
   002_add_feature.sql
   ```

2. Use sequential numbering (002, 003, etc.)

3. Make migrations idempotent:
   ```sql
   CREATE TABLE IF NOT EXISTS new_table (...);
   ALTER TABLE existing_table ADD COLUMN IF NOT EXISTS new_column ...;
   ```

4. Test on staging first!

5. Run migration:
   ```bash
   npm run migrate
   ```

### Migration File Structure

```sql
-- =====================================================
-- Migration: 002_add_feature
-- Description: Add new feature tables
-- Date: YYYY-MM-DD
-- =====================================================

-- Your SQL statements here

-- Record migration (optional, automatic)
INSERT INTO schema_migrations (migration_name, checksum) 
VALUES ('002_add_feature', SHA2('002_add_feature.sql', 256));
```

## Backup and Restore

### Create Backup

```bash
# Full database backup
mysqldump -u root -p voting > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
mysqldump -u root -p voting | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore from Backup

```bash
# Restore from backup
mysql -u root -p voting < backup_20251020_120000.sql

# Restore from compressed backup
gunzip < backup_20251020_120000.sql.gz | mysql -u root -p voting
```

### Backup Critical Tables Only

```bash
mysqldump -u root -p voting \
  votes_meta \
  vote_receipts \
  audit_logs \
  elections > critical_backup.sql
```

## Security Considerations

### Database User Privileges

For production, create a limited-privilege user:

```sql
-- Create application user
CREATE USER 'voting_app'@'localhost' IDENTIFIED BY 'strong_password_here';

-- Grant only necessary privileges
GRANT SELECT, INSERT, UPDATE ON voting.* TO 'voting_app'@'localhost';

-- Revoke dangerous privileges
REVOKE DELETE, DROP, CREATE, ALTER ON voting.* FROM 'voting_app'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;
```

Update `.env`:
```env
DB_USER=voting_app
DB_PASSWORD=strong_password_here
```

### Enable Audit Logging

```sql
-- Enable MySQL audit log (if using MySQL Enterprise)
SET GLOBAL audit_log_policy = ALL;

-- Or use general query log (development only)
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'TABLE';
```

### Connection Encryption

For production, enable SSL/TLS:

```javascript
// In config/db.js
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync('/path/to/ca.pem'),
    rejectUnauthorized: true
  }
});
```

## Troubleshooting

### Migration Fails with "Table already exists"

The migration is idempotent and should handle existing tables. If it fails:

1. Check which tables exist:
   ```bash
   mysql -u root -p voting -e "SHOW TABLES;"
   ```

2. Drop specific problematic table:
   ```sql
   DROP TABLE IF EXISTS problematic_table;
   ```

3. Re-run migration:
   ```bash
   npm run migrate
   ```

### Connection Refused Error

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solutions:**
1. Check MySQL is running:
   ```bash
   # Linux/Mac
   sudo systemctl status mysql
   
   # Windows
   net start MySQL80
   ```

2. Check MySQL port:
   ```bash
   mysql -u root -p -e "SHOW VARIABLES LIKE 'port';"
   ```

3. Verify credentials in `.env`

### Character Encoding Issues

If you see garbled text:

1. Set database charset:
   ```sql
   ALTER DATABASE voting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Update connection settings in `config/db.js`:
   ```javascript
   const pool = mysql.createPool({
     // ... other settings
     charset: 'utf8mb4'
   });
   ```

### Slow Queries

1. Enable slow query log:
   ```sql
   SET GLOBAL slow_query_log = 'ON';
   SET GLOBAL long_query_time = 2; -- Log queries taking > 2 seconds
   ```

2. Analyze slow queries:
   ```bash
   mysqldumpslow /var/log/mysql/slow-query.log
   ```

3. Add indexes as needed

## Performance Optimization

### Recommended MySQL Configuration

Add to `/etc/mysql/my.cnf` (Linux) or `my.ini` (Windows):

```ini
[mysqld]
# InnoDB settings
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Query cache (MySQL 5.7, removed in 8.0)
# query_cache_size = 64M
# query_cache_type = 1

# Connection settings
max_connections = 200
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

Restart MySQL after changes.

### Connection Pooling

The application uses connection pooling. Adjust in `config/db.js`:

```javascript
const pool = mysql.createPool({
  // ... other settings
  connectionLimit: 10,    // Increase for high load
  queueLimit: 0,          // No limit on queued connections
  waitForConnections: true
});
```

## Monitoring

### Check Table Sizes

```sql
SELECT 
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'voting'
ORDER BY (data_length + index_length) DESC;
```

### Monitor Active Connections

```sql
SHOW PROCESSLIST;

-- Or count by state
SELECT state, COUNT(*) as connections
FROM information_schema.PROCESSLIST
GROUP BY state;
```

### Check Index Usage

```sql
-- Find unused indexes
SELECT * FROM sys.schema_unused_indexes
WHERE object_schema = 'voting';

-- Find missing indexes (queries not using indexes)
SELECT * FROM sys.statements_with_full_table_scans
WHERE db = 'voting';
```

## Next Steps

1. ✅ Database schema created
2. ⏭️ Start backend server: `npm start`
3. ⏭️ Test database connection
4. ⏭️ Create admin user
5. ⏭️ Set up blockchain node
6. ⏭️ Run integration tests

## Additional Resources

- [Database Schema Documentation](./DATABASE_SCHEMA.md)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [MySQL Security Best Practices](https://dev.mysql.com/doc/refman/8.0/en/security-guidelines.html)

---

**Questions or Issues?**  
Check the troubleshooting section or review logs in `backend/logs/`
