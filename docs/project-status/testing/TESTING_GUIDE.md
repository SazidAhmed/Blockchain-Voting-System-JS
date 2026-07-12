# 🚀 Quick Testing Guide - Backend Crypto Integration

## ⚡ Quick Start (15 Minutes Total)

### Prerequisites Check
- [ ] MySQL installed
- [ ] Node.js installed
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Frontend dependencies installed (`cd frontend && npm install`)

---

## 📋 Step-by-Step Testing

### Step 1: Start MySQL (2 minutes)

**Windows:**
```bash
# Option 1: Services app
# Press Win+R → type "services.msc" → Find "MySQL" → Start

# Option 2: Command line
net start MySQL80
```

**Linux/Mac:**
```bash
# Linux
sudo systemctl start mysql

# Mac
brew services start mysql
```

**Verify MySQL is running:**
```bash
mysql -u root -p
# If you can connect, MySQL is running ✓
```

---

### Step 2: Run Database Migration (1 minute)

```bash
cd backend
npm run migrate
```

**Expected Output:**
```
========================================
Database Migration Runner
========================================

✓ Connected to database: voting

Found 2 migration file(s)

→ Running migration: 001_initial_schema
  ⊙ Already applied, skipping

→ Running migration: 002_add_crypto_fields
  ✓ Successfully applied

========================================
Migration Summary
========================================
Total migrations: 2
Applied: 1
Skipped: 1

✓ All migrations completed successfully!
```

**If Migration Fails:**
- Check MySQL is running
- Check `.env` file has correct DB credentials
- Check DB_PASSWORD in `.env` (may be empty)

---

### Step 3: Start Backend (1 minute)

```bash
cd backend
npm run dev
```

**Expected Output:**
```
Server running on port 3000
Database connected
```

**Keep this terminal open** ✋

---

### Step 4: Start Frontend (1 minute)

**New terminal:**
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE ready in 500ms

➜  Local:   http://localhost:5173/
```

**Keep this terminal open** ✋

---

### Step 5: Test Registration with Keys (3 minutes)

1. **Open browser:** http://localhost:5173
2. **Open DevTools:** Press F12
3. **Go to Console tab**
4. **Navigate to Register page**
5. **Fill in form:**
   - Institution ID: `TEST001`
   - Username: `testuser`
   - Password: `password123`
   - Role: `student`
   - Email: `test@university.edu`

6. **Click Register**

**Expected Console Output:**
```
🔑 Generating cryptographic keys...
✓ ECDSA keypair generated
✓ RSA keypair generated
✓ Keys exported to Base64
📤 Sending public keys to backend
✓ Registration successful
✓ Keys stored in localStorage
```

**Verify in DevTools:**
- Go to **Application** tab
- Expand **Local Storage** → `http://localhost:5173`
- Should see:
  - `user_signing_key_private`
  - `user_signing_key_public`
  - `user_encryption_key_private`
  - `user_encryption_key_public`

✅ **Keys Generated Successfully!**

---

### Step 6: Test Login with Key Loading (2 minutes)

1. **Click Logout** (if still logged in)
2. **Go to Login page**
3. **Enter credentials:**
   - Institution ID: `TEST001`
   - Password: `password123`

4. **Click Login**

**Expected Console Output:**
```
📥 Loading keys from localStorage
✓ Keys loaded successfully
✓ Signing key imported
✓ Encryption key imported
🔐 Crypto initialized: Keys loaded
```

✅ **Keys Loaded Successfully!**

---

### Step 7: Test Encrypted Voting (5 minutes)

#### 7.1 Create an Election (Admin)

**Option A: Use Database Directly**
```bash
mysql -u root -p voting

INSERT INTO elections (title, description, start_date, end_date, status, created_by, public_key) 
VALUES ('Test Election', 'Testing crypto', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'active', 1, 'test_key_123');

INSERT INTO candidates (election_id, name, description) VALUES 
(1, 'Alice Johnson', 'Candidate A'),
(1, 'Bob Smith', 'Candidate B');

INSERT INTO voter_registrations (user_id, election_id, status) 
VALUES (1, 1, 'registered');

exit;
```

**Option B: Use API** (if admin endpoint working)
```bash
# Get JWT token from registration/login response
curl -X POST http://localhost:3000/api/elections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Election",
    "description": "Testing crypto",
    "startDate": "2025-10-21T00:00:00Z",
    "endDate": "2025-10-22T23:59:59Z",
    "candidates": [
      {"name": "Alice Johnson", "description": "Candidate A"},
      {"name": "Bob Smith", "description": "Candidate B"}
    ]
  }'
```

#### 7.2 Cast a Vote

1. **Navigate to Elections page**
2. **Click on "Test Election"**
3. **Select a candidate** (e.g., Alice Johnson)
4. **Click "Vote"**

**Expected Console Output:**
```
🗳️ Preparing to vote...
🔐 Keys loaded: true
📊 Election ID: 1
👤 Candidate: Alice Johnson

🔑 Generating nullifier...
✓ Nullifier: a4b3c2d1e0f9...

🔒 Encrypting ballot...
✓ Ballot encrypted

✍️ Signing vote package...
✓ Vote signed

📤 Submitting encrypted vote...
✓ Vote submitted successfully

📜 Receipt generated:
  Transaction Hash: a7f3e8c2d1b0...
  Nullifier: a4b3c2d1e0f9...
  Signature: MEUCIQD5F1...
  Timestamp: 2025-10-21T10:30:00.000Z
```

**Expected Receipt Display:**
- Should show receipt component
- Transaction hash displayed
- Nullifier displayed
- Signature displayed
- Download and Print buttons available

✅ **Vote Cast Successfully!**

---

### Step 8: Verify in Database (2 minutes)

```bash
mysql -u root -p voting
```

**Check encrypted vote:**
```sql
SELECT 
  id,
  election_id,
  LEFT(nullifier_hash, 20) as nullifier,
  LEFT(encrypted_ballot, 30) as encrypted,
  LEFT(signature, 20) as sig,
  LEFT(voter_public_key, 30) as pubkey
FROM votes_meta;
```

**Expected Output:**
```
+----+-------------+----------------------+--------------------------------+----------------------+--------------------------------+
| id | election_id | nullifier            | encrypted                      | sig                  | pubkey                         |
+----+-------------+----------------------+--------------------------------+----------------------+--------------------------------+
|  1 |           1 | a4b3c2d1e0f9...      | SGVsbG8gV29ybGQ=...            | MEUCIQD5F1...        | eyJrdHkiOiJFQyIsImNy...        |
+----+-------------+----------------------+--------------------------------+----------------------+--------------------------------+
```

✅ **Encrypted Vote Stored!**

**Check receipt:**
```sql
SELECT * FROM vote_receipts WHERE election_id = 1;
```

**Check registration status:**
```sql
SELECT user_id, election_id, status, voted_at 
FROM voter_registrations 
WHERE user_id = 1 AND election_id = 1;
```

Expected: `status = 'voted'` and `voted_at` has timestamp

✅ **All Database Records Correct!**

---

## 🧪 Advanced Testing

### Test Double-Vote Prevention

1. **Try to vote again** with same keys
2. **Expected Error:**
   ```json
   {
     "message": "This nullifier has already been used (possible double-vote attempt)"
   }
   ```

✅ **Double-Vote Prevention Works!**

### Test Signature Verification

**Backend Terminal Output:**
```
Processing vote with client-side cryptography
⚠️  Using simplified signature verification (development mode)
✅ Signature verified, nullifier checked
```

✅ **Signature Verification Works!**

### Test Key Persistence

1. **Close browser completely**
2. **Reopen http://localhost:5173**
3. **Login again**
4. **Check Console:** Should see "Keys loaded successfully"

✅ **Key Persistence Works!**

---

## 🐛 Troubleshooting

### Problem: "Connection refused" when migrating

**Solution:**
```bash
# Check if MySQL is running
mysql -u root -p
# If error, start MySQL service
```

### Problem: Migration says "already applied"

**Solution:** This is normal! Migration 001 was already run.

### Problem: "Invalid signature"

**Possible Causes:**
1. Keys not loaded properly
2. Data format mismatch
3. Signature verification logic issue

**Debug:**
```javascript
// Check if keys are loaded
console.log('Keys loaded:', KeyManager.isInitialized());

// Check signature before sending
console.log('Signature:', signature);
console.log('Public Key:', publicKey);
```

### Problem: "User not registered for election"

**Solution:**
```sql
-- Register user manually
INSERT INTO voter_registrations (user_id, election_id, status) 
VALUES (1, 1, 'registered');
```

### Problem: Frontend can't reach backend

**Check:**
1. Backend running on port 3000
2. Frontend proxy configured correctly
3. CORS enabled in backend

---

## ✅ Success Checklist

After completing all tests, verify:

- [ ] MySQL running
- [ ] Migration executed successfully
- [ ] Backend running on port 3000
- [ ] Frontend running on port 5173
- [ ] Registration generates keys
- [ ] Keys stored in localStorage
- [ ] Login loads keys
- [ ] Vote encrypts ballot
- [ ] Vote signs with ECDSA
- [ ] Nullifier prevents double-vote
- [ ] Receipt displayed
- [ ] Database has encrypted vote
- [ ] Database has signature
- [ ] Backend logs show crypto processing

**All checkboxes checked?** 🎉 **CONGRATULATIONS! Your encrypted voting system is working!**

---

## 📝 What to Test Next

1. **Multiple users voting**
   - Register 5 users
   - Each votes for different candidates
   - Verify all votes encrypted

2. **Key recovery**
   - Export keys to file
   - Clear localStorage
   - Import keys back
   - Vote again

3. **Performance testing**
   - Time key generation
   - Time encryption
   - Time signature creation
   - Measure vote submission time

4. **Error handling**
   - Vote without keys
   - Vote with wrong signature
   - Vote after election ends
   - Vote in non-existent election

---

## 🎯 Next Steps After Testing

Once all tests pass:

1. **Enable full ECDSA verification** (switch from simplified mode)
2. **Add rate limiting** (protect endpoints)
3. **Add audit logging** (track all crypto operations)
4. **Implement PBKDF2** (encrypt keys in localStorage)
5. **Connect to blockchain node** (store votes on-chain)

---

**Happy Testing! 🚀**
