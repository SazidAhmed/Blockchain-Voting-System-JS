# Database Quick Reference

## Quick Start (First Time Setup)

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Run migrations (creates all tables)
npm run migrate

# 4. Seed sample data (development only)
npm run db:seed

# 5. Start the backend server
npm start
```

## Common Commands

```bash
# Database Migration
npm run migrate              # Run all pending migrations
npm run migrate:status       # Check migration status

# Database Seeding (Development)
npm run db:seed             # Add sample data
npm run db:reset            # Reset DB and seed (migrate + seed)

# Server
npm start                   # Start production server
npm run dev                 # Start development server with nodemon
```

## Default Credentials (Development Only)

| Role | Institution ID | Password |
|------|---------------|----------|
| Admin | ADMIN001 | admin123 |
| Student | STU001 | password123 |
| Teacher | TEACH001 | password123 |
| Staff | STAFF001 | password123 |

## Database Tables Summary

### User Management
- `users` - Voter accounts (7 sample users)
- `blind_tokens` - Anonymous eligibility tokens
- `voter_registrations` - Registration tracking

### Elections
- `elections` - Election configs (3 sample elections)
- `candidates` - Candidates (8 total candidates)
- `votes_meta` - Vote records and nullifiers
- `vote_receipts` - Cryptographic receipts

### Blockchain Network
- `nodes` - Validator nodes (4 sample nodes)
- `threshold_key_shares` - Key share metadata
- `tally_partial_decryptions` - Decryption shares

### System
- `audit_logs` - Tamper-evident audit trail
- `system_config` - Global configuration
- `schema_migrations` - Migration tracking

## Sample Data Overview

### Users (7 total)
1. Admin User (admin)
2. Alice Student (student)
3. Bob Student (student)
4. Charlie Student (student)
5. Dr. Smith (teacher)
6. Jane Staff (staff)
7. Board Member Johnson (board_member)

### Elections (3 total)
1. **Student Union President Election 2025** (active)
   - 3 candidates
   - Students registered

2. **University Board Election** (pending)
   - 3 candidates
   - Starts tomorrow

3. **Budget Allocation Referendum** (completed)
   - 2 options (Yes/No)
   - Already has votes

### Nodes (4 total)
- validator-node-1 (active)
- validator-node-2 (active)
- validator-node-3 (active)
- observer-node-1 (active)

## Useful SQL Queries

### Check active elections
```sql
SELECT id, title, status, start_date, end_date 
FROM elections 
WHERE status = 'active';
```

### Count votes by election
```sql
SELECT 
    e.title,
    COUNT(vr.id) as registered,
    SUM(CASE WHEN vr.status = 'voted' THEN 1 ELSE 0 END) as voted
FROM elections e
LEFT JOIN voter_registrations vr ON e.id = vr.election_id
GROUP BY e.id, e.title;
```

### Check node health
```sql
SELECT node_id, status, node_type, last_seen
FROM nodes
WHERE node_type = 'validator'
ORDER BY last_seen DESC;
```

### Recent audit events
```sql
SELECT event_type, user_id, timestamp, severity
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 20;
```

## API Endpoints (After Server Start)

### Health Check
```bash
curl http://localhost:3000/health
```

### User Registration
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "institutionId": "TEST001",
    "username": "Test User",
    "password": "password123",
    "role": "student",
    "email": "test@university.edu"
  }'
```

### User Login
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "institutionId": "STU001",
    "password": "password123"
  }'
```

### Get Elections
```bash
curl http://localhost:3000/api/elections
```

## Troubleshooting

### "Database does not exist"
```bash
# Create database manually
mysql -u root -p -e "CREATE DATABASE voting;"

# Then run migrations
npm run migrate
```

### "Table already exists"
```bash
# Check migration status
npm run migrate:status

# If needed, drop and recreate
mysql -u root -p voting -e "DROP DATABASE voting; CREATE DATABASE voting;"
npm run migrate
```

### "Connection refused"
```bash
# Check MySQL is running
sudo systemctl status mysql  # Linux
net start MySQL80           # Windows

# Check connection settings in .env
```

### Reset everything (DANGER!)
```bash
# This will DELETE ALL DATA
mysql -u root -p -e "DROP DATABASE IF EXISTS voting; CREATE DATABASE voting;"
npm run db:reset
```

## File Locations

```
backend/
├── migrate.js              # Migration runner
├── seed.js                 # Sample data seeder
├── DATABASE_SETUP.md       # Detailed setup guide
├── DATABASE_SCHEMA.md      # Full schema documentation
├── config/
│   └── db.js              # Database connection config
└── migrations/
    └── 001_initial_schema.sql  # Initial schema migration
```

## Environment Variables

Required in `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=voting
JWT_SECRET=your_secret_key
BLOCKCHAIN_NODE_URL=http://localhost:3001
PORT=3000
```

## Next Steps After Setup

1. ✅ Database created and seeded
2. ⏭️ Start backend: `npm start`
3. ⏭️ Test login with sample users
4. ⏭️ Start blockchain node
5. ⏭️ Start frontend
6. ⏭️ Test voting flow

## Production Notes

**DO NOT use in production without:**
- [ ] Changing all default passwords
- [ ] Enabling MFA
- [ ] Setting up SSL/TLS for database
- [ ] Configuring proper backup strategy
- [ ] Using limited-privilege database user
- [ ] Enabling audit logging
- [ ] Setting up monitoring
- [ ] Security audit and penetration testing

---

**For detailed documentation, see:**
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Complete setup guide
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Schema documentation
