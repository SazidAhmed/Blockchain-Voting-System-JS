# Frontend Integration Test Plan
**Date:** October 31, 2025  
**Status:** In Progress  
**Tester:** AI Assistant + User

## Overview
Testing the complete end-to-end voting flow in the browser with focus on cryptographic operations and user experience.

## Test Environment
- **Frontend:** http://localhost:5173 (Vite dev server - RUNNING ✅)
- **Backend:** http://localhost:3000 (Node.js API server - RUNNING ✅)
- **Database:** MySQL (NOT RUNNING ❌ - Will test with registration flow)
- **Browser:** Modern browser with Web Crypto API support

## Prerequisites Setup Status
- ✅ Backend server started on port 3000
- ✅ Frontend dev server started on port 5173
- ❌ MySQL database not running
- ⚠️ **Action Required:** Start MySQL or seed database

## Test Cases

### 1. User Registration Flow
**Priority:** HIGH  
**Status:** Ready to Test

**Steps:**
1. Navigate to http://localhost:5173/register
2. Fill registration form:
   - Username: `test_user_1`
   - Email: `test1@university.edu`
   - Institution ID: `STU001`
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
   - Role: `student`
3. Submit form
4. **Expected Results:**
   - ECDSA P-256 keypair generated
   - RSA-OAEP 2048-bit keypair generated
   - Keys stored in localStorage
   - Console logs: "Keys generated successfully"
   - Redirect to login or elections page
5. **Verify in Browser DevTools:**
   - Open Application tab → Local Storage
   - Check for: `voting_ecdsa_privateKey`, `voting_rsa_privateKey`
   - Keys should be present and encrypted

**Crypto Operations to Verify:**
- ✅ ECDSA keypair generation (P-256 curve)
- ✅ RSA keypair generation (2048-bit)
- ✅ Key storage in localStorage
- ✅ Public keys sent to backend

---

### 2. User Login Flow
**Priority:** HIGH  
**Status:** Pending Test Case 1

**Steps:**
1. Navigate to http://localhost:5173/login
2. Enter credentials:
   - Institution ID: `STU001`
   - Password: `TestPass123!`
3. Submit login form
4. **Expected Results:**
   - JWT token received from backend
   - Keys loaded from localStorage
   - Crypto status shows "Keys Loaded"
   - Redirect to elections page
5. **Verify in Console:**
   - Check for: "Keys loaded successfully"
   - Verify token stored in localStorage

**Crypto Operations to Verify:**
- ✅ Keys retrieved from localStorage
- ✅ Keys loaded into memory
- ✅ Authentication successful

---

### 3. View Elections List
**Priority:** MEDIUM  
**Status:** Pending Test Cases 1-2

**Steps:**
1. After login, view elections list at `/elections`
2. **Expected Results:**
   - List of available elections displayed
   - Each election shows: title, description, dates, status
   - "Vote" button enabled for active elections
   - "Voted" indicator if already voted
3. **Database Dependency:**
   - Need at least 1 active election in database
   - If no elections, verify empty state message

---

### 4. Election Detail View
**Priority:** MEDIUM  
**Status:** Pending Test Case 3

**Steps:**
1. Click on an election from the list
2. Navigate to `/elections/:id`
3. **Expected Results:**
   - Election details displayed
   - List of candidates shown
   - Vote button visible
   - Crypto status indicator shows key status

---

### 5. End-to-End Voting Flow
**Priority:** CRITICAL  
**Status:** Pending Test Cases 1-4

**Steps:**
1. Navigate to `/elections/:id/vote`
2. Select a candidate
3. Click "Submit Vote"
4. **Expected Cryptographic Operations:**
   - **Step 1:** Generate nullifier
     - `nullifier = SHA-256(privateKey + electionId)`
     - Should be deterministic (same voter + election = same nullifier)
   - **Step 2:** Encrypt ballot
     - Use election's RSA public key
     - `encryptedBallot = RSA-OAEP-Encrypt(ballot, electionPubKey)`
   - **Step 3:** Sign vote package
     - Create package: `{ encryptedBallot, nullifier, electionId, timestamp }`
     - `signature = ECDSA-Sign(package, voterPrivateKey)`
   - **Step 4:** Submit to backend
     - POST to `/api/elections/:id/vote`
     - Payload includes: encryptedBallot, nullifier, signature, publicKey
5. **Expected Results:**
   - Vote submitted successfully (HTTP 201)
   - Receipt generated with:
     - Nullifier hash
     - Signature
     - Transaction hash
     - Timestamp
   - Success message displayed
   - Redirect to receipt page

**Verification Steps:**
- Check browser console for crypto logs
- Verify ballot is encrypted (should not be readable)
- Verify signature is generated
- Verify nullifier is a SHA-256 hash (64 hex chars)
- Backend should verify signature

---

### 6. Vote Receipt Display
**Priority:** HIGH  
**Status:** Pending Test Case 5

**Steps:**
1. After voting, view receipt at `/elections/:id/receipt`
2. **Expected Receipt Components:**
   - ✅ Election title
   - ✅ Vote timestamp
   - ✅ Nullifier hash (for tracking)
   - ✅ Digital signature
   - ✅ Transaction hash (if blockchain integrated)
   - ✅ QR code (optional)
3. **Test Receipt Actions:**
   - Click "Download Receipt" → PDF/JSON downloaded
   - Click "Print Receipt" → Print dialog opens
4. **Verify Receipt Security:**
   - Receipt does NOT reveal vote choice
   - Receipt contains cryptographic proof
   - Receipt is verifiable independently

---

### 7. Double Vote Prevention
**Priority:** CRITICAL  
**Status:** Pending Test Case 5

**Steps:**
1. After voting successfully (Test Case 5)
2. Try to vote again in the same election
3. Navigate to `/elections/:id/vote`
4. **Expected Results:**
   - Backend rejects vote (HTTP 400 or 409)
   - Error message: "You have already voted in this election"
   - Nullifier recognized as duplicate
   - Audit log created for double-vote attempt
5. **Verify:**
   - Same nullifier generated (deterministic)
   - Backend prevents duplicate vote
   - User cannot circumvent restriction

---

### 8. Multiple Users Voting
**Priority:** HIGH  
**Status:** Pending Test Cases 1-7

**Steps:**
1. **Create Second User:**
   - Logout from first user
   - Register new user: `test_user_2` / `STU002`
   - Login with second user
2. **Vote in Same Election:**
   - Navigate to same election
   - Cast vote for different candidate
3. **Expected Results:**
   - Second user's vote accepted
   - Different nullifier generated (different user)
   - Both votes recorded independently
   - No interference between users
4. **Verify:**
   - Check that nullifiers are different
   - Both votes in database (if accessible)
   - Both users can view their own receipts

---

### 9. Signature Verification
**Priority:** CRITICAL  
**Status:** Pending Test Case 5

**Steps:**
1. Submit a vote (Test Case 5)
2. **Backend should verify:**
   - Signature matches public key
   - Signature is valid for the payload
   - Public key belongs to registered voter
3. **Test Invalid Signature:**
   - Modify vote package in browser console
   - Try to submit with mismatched signature
4. **Expected Results:**
   - Backend rejects invalid signature (HTTP 401)
   - Error: "Invalid signature"
   - Audit log created for failed signature

**Manual Verification:**
- Check backend logs for "Signature verification: SUCCESS"
- Check audit_logs table for SIGNATURE_VERIFIED events

---

### 10. Crypto Status Indicators
**Priority:** LOW  
**Status:** Pending Test Cases 1-2

**Steps:**
1. **Before Login:**
   - Crypto status should show: "Not logged in" or "Keys not loaded"
2. **After Login:**
   - Crypto status should show: "Keys loaded ✅"
3. **During Voting:**
   - Watch for status updates during encryption
4. **Verify UI Feedback:**
   - Loading spinners during crypto operations
   - Success/error messages
   - Status indicators accurate

---

### 11. Browser Compatibility
**Priority:** MEDIUM  
**Status:** Pending All Tests

**Test in Multiple Browsers:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

**Verify Web Crypto API Support:**
- Check `window.crypto.subtle` exists
- All crypto operations work
- No console errors

---

### 12. localStorage Key Management
**Priority:** HIGH  
**Status:** Ready to Test

**Steps:**
1. After registration, inspect localStorage
2. **Expected Keys in localStorage:**
   - `voting_ecdsa_privateKey` (base64 or hex)
   - `voting_ecdsa_publicKey`
   - `voting_rsa_privateKey` (base64 or hex)
   - `voting_rsa_publicKey`
   - `token` (JWT after login)
   - `user` (user info JSON)
3. **Test Key Persistence:**
   - Refresh page → Keys still present
   - Close and reopen tab → Keys still present
   - Logout → Keys should be cleared
4. **Security Check:**
   - Private keys should be encrypted or encoded
   - Keys not readable as plain text

---

### 13. Error Handling
**Priority:** MEDIUM  
**Status:** Pending Various Test Cases

**Test Error Scenarios:**
1. **Network Error:**
   - Stop backend server
   - Try to vote → Should show error message
2. **Invalid Input:**
   - Submit empty vote → Should show validation error
3. **Session Timeout:**
   - Wait for JWT expiration → Should redirect to login
4. **Crypto Failure:**
   - Simulate key load failure → Should show error

---

### 14. Performance Testing
**Priority:** LOW  
**Status:** Pending Successful Functional Tests

**Measure:**
1. **Key Generation Time:**
   - Registration should complete in < 2 seconds
2. **Encryption Time:**
   - Vote encryption should complete in < 500ms
3. **Signature Generation:**
   - Should complete in < 100ms
4. **Overall Vote Submission:**
   - End-to-end should complete in < 3 seconds

**Log in Console:**
- Check for crypto operation timing logs
- Verify no performance bottlenecks

---

## Database Setup Requirements

### Option 1: Start MySQL and Seed Database
```bash
# Start MySQL service (Windows)
net start MySQL80  # or your MySQL service name

# Run migrations
cd backend
node migrate.js

# Seed sample data
node seed.js
```

**Test Credentials from Seed:**
- Admin: `ADMIN001` / `admin123`
- Student: `STU001` / `password123`
- Teacher: `TEACH001` / `password123`

### Option 2: Manual Testing (Current Approach)
- Register users through UI
- Create elections through admin panel (if available)
- Or register multiple users and test registration flow

---

## Current Blockers

### 🚫 Blocker 1: MySQL Not Running
**Impact:** Cannot test with pre-seeded data  
**Workaround:** Use registration flow to create test users  
**Resolution:** Start MySQL and run seed script

### ⚠️ Partial Blocker: No Elections in Database
**Impact:** Cannot test voting flow without elections  
**Workaround:** Need to either:
1. Create election creation UI
2. Manually insert election via SQL
3. Run seed script (requires MySQL)

---

## Testing Progress

### Completed
- ✅ Backend server started
- ✅ Frontend server started
- ✅ Browser opened to frontend

### In Progress
- ⏳ Test Case 1: User Registration

### Pending
- ⏳ Database setup
- ⏳ Test Cases 2-14
- ⏳ Bug fixes and refinements

---

## Success Criteria

To mark Frontend Integration Testing as COMPLETE:
- ✅ User can register with key generation
- ✅ User can login and load keys
- ✅ User can view elections list
- ✅ User can cast encrypted vote
- ✅ Vote signature verified by backend
- ✅ Receipt generated and downloadable
- ✅ Double vote prevented
- ✅ Multiple users can vote independently
- ✅ All crypto operations work in browser
- ✅ No console errors
- ✅ Rate limiting works (tested separately ✅)
- ✅ Audit logging captures events (tested separately ✅)

---

## Next Steps

1. **Immediate:** Start MySQL and seed database
2. **Then:** Execute Test Case 1 (Registration)
3. **Then:** Execute Test Cases 2-14 in sequence
4. **Document:** Record results for each test case
5. **Fix:** Address any bugs found
6. **Complete:** Update todo list when all tests pass

---

**Test Plan Created:** October 31, 2025  
**Backend Status:** ✅ Running on port 3000  
**Frontend Status:** ✅ Running on port 5173  
**Database Status:** ❌ MySQL not started  
**Ready to Test:** Registration flow (without database dependency)
