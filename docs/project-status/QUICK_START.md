# 🚀 Quick Start - Database Setup Complete!

## ✅ What's Ready

Your database schema is now **100% complete** with:
- 13 production-ready tables
- Migration system
- Sample data seeder
- Comprehensive documentation

## 🏃 Run This Now

### Option 1: Full Setup with Sample Data (Recommended for Development)

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your MySQL password
# (Use any text editor)

# Run migrations + seed data in one command
npm run db:reset
```

### Option 2: Production Setup (No Sample Data)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env
npm run migrate
```

## 📝 Edit Your .env File

Open `backend/.env` and set:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=voting
JWT_SECRET=change_this_to_a_long_random_string
```

## ✨ Expected Output

After `npm run db:reset`, you should see:

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

========================================
Database Seeder - Development Data
========================================

→ Clearing existing seed data...
  ✓ Cleared existing data

→ Seeding users...
  ✓ Created user: Admin User (admin)
  ✓ Created user: Alice Student (student)
  ✓ Created user: Bob Student (student)
  ✓ Created user: Charlie Student (student)
  ✓ Created user: Dr. Smith (teacher)
  ✓ Created user: Jane Staff (staff)
  ✓ Created user: Board Member Johnson (board_member)

→ Seeding elections...
  ✓ Created election: Student Union President Election 2025 (active)
  ✓ Created election: University Board Election (pending)
  ✓ Created election: Budget Allocation Referendum (completed)

→ Seeding candidates...
  [8 candidates created]

→ Seeding validator nodes...
  [4 nodes created]

========================================
Seeding Summary
========================================
Users created: 7
Elections created: 3
Candidates created: 8
Nodes created: 4

✓ Database seeding completed successfully!

📝 Login Credentials (Development Only):
  Admin:    ADMIN001 / admin123
  Student:  STU001 / password123
  Teacher:  TEACH001 / password123
  Staff:    STAFF001 / password123
```

## 🎯 Test It

```bash
# Check migration status
npm run migrate:status

# Start the backend server
npm start

# In another terminal, test the API
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","message":"Server is running"}
```

## 📚 What You Got

### 1. Database Tables (13 Total)

**Core Voting:**
- `users` - 7 sample users
- `elections` - 3 sample elections
- `candidates` - 8 sample candidates
- `blind_tokens` - Privacy-preserving tokens
- `voter_registrations` - Registration tracking
- `votes_meta` - Vote records
- `vote_receipts` - Cryptographic receipts

**Blockchain:**
- `nodes` - 4 validator nodes
- `threshold_key_shares` - Key management
- `tally_partial_decryptions` - Threshold decryption

**System:**
- `audit_logs` - Tamper-evident logging
- `system_config` - Configuration
- `schema_migrations` - Version tracking

### 2. NPM Scripts

```bash
npm run migrate          # Run migrations
npm run migrate:status   # Check status
npm run db:seed          # Add sample data
npm run db:reset         # Reset & seed
npm start                # Start server
npm run dev              # Dev mode (nodemon)
```

### 3. Documentation

- `DATABASE_SCHEMA.md` - Full schema docs (450+ lines)
- `DATABASE_SETUP.md` - Setup guide (650+ lines)
- `DATABASE_QUICK_REFERENCE.md` - Quick reference (280+ lines)
- `DATABASE_COMPLETION_SUMMARY.md` - Completion report

### 4. Sample Data

**Users:**
- 1 Admin
- 3 Students (Alice, Bob, Charlie)
- 1 Teacher (Dr. Smith)
- 1 Staff (Jane)
- 1 Board Member (Johnson)

**Elections:**
1. Student Union President (active, 3 candidates)
2. University Board (pending, 3 candidates)
3. Budget Referendum (completed, 2 options)

**Nodes:**
- 3 validator nodes
- 1 observer node

## 🔐 Default Login (Development Only)

```bash
# Test login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "institutionId": "STU001",
    "password": "password123"
  }'
```

## 🐛 Troubleshooting

### "Cannot connect to MySQL"
```bash
# Make sure MySQL is running
sudo systemctl start mysql    # Linux
net start MySQL80            # Windows

# Check .env has correct password
```

### "Database does not exist"
```bash
# Create it manually
mysql -u root -p -e "CREATE DATABASE voting;"

# Then run migration
npm run migrate
```

### "ENOENT: .env file not found"
```bash
# Copy the example file
cp .env.example .env

# Edit with your settings
```

## ✅ Verify Everything Works

```bash
# 1. Check tables were created
mysql -u root -p voting -e "SHOW TABLES;"

# Should show 13 tables

# 2. Check sample data
mysql -u root -p voting -e "SELECT COUNT(*) FROM users;"

# Should show: 7

# 3. Start server
npm start

# 4. Test health endpoint
curl http://localhost:3000/health

# Should return: {"status":"ok"}
```

## 🎉 Success!

Your database is ready! Next steps:

1. ✅ Database schema complete
2. ⏭️ Test the API endpoints
3. ⏭️ Start frontend development
4. ⏭️ Implement real cryptography
5. ⏭️ Add testing

## 📖 Need Help?

Check the detailed guides:
- **Setup Issues:** `DATABASE_SETUP.md`
- **Schema Details:** `DATABASE_SCHEMA.md`
- **Quick Commands:** `DATABASE_QUICK_REFERENCE.md`

---

**Ready to code?** Start the backend server with `npm start` and begin testing! 🚀
