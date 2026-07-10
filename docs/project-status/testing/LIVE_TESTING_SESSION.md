# 🧪 Frontend Encrypted Voting - Live Testing Session

**Date:** October 21, 2025  
**Status:** 🔴 TESTING IN PROGRESS  
**URL:** http://localhost:5174

---

## ✅ Pre-Test Checklist

- [x] MySQL running
- [x] Backend running on port 3000
- [x] Frontend running on port 5174
- [x] Test election created (ID: 4)
- [x] 3 candidates ready (Alice, Bob, Carol)
- [ ] Browser DevTools open (F12)
- [ ] Console tab visible
- [ ] Ready to test

---

## 📋 Test 1: User Registration with Key Generation

### Steps:
1. ✅ Open: http://localhost:5174/#/register
2. Fill in the form:
   ```
   Institution ID: CRYPTO001
   Username: frontendtest
   Password: test123
   Confirm Password: test123
   Role: student
   Email: frontend@test.edu
   ```
3. **Open DevTools (F12)** → Go to **Console** tab
4. Click **Register** button

### Expected Results:
```
Console should show:
🔑 Generating cryptographic keys...
✓ ECDSA keypair generated
✓ RSA keypair generated  
✓ Keys exported to Base64
📤 Sending public keys to backend
✓ Registration successful
✓ Keys stored in localStorage
```

### Verification:
- [ ] Console shows key generation messages
- [ ] Registration succeeds
- [ ] Redirected to home/dashboard
- [ ] No errors in console

**Go to DevTools → Application Tab → Local Storage → http://localhost:5174**

Should see 4 keys:
- [ ] `user_signing_key_private`
- [ ] `user_signing_key_public`
- [ ] `user_encryption_key_private`
- [ ] `user_encryption_key_public`

**Screenshot the localStorage keys!** 📸

### Result: ___________

---

## 📋 Test 2: User Login with Key Loading

### Steps:
1. If logged in, click **Logout**
2. Go to: http://localhost:5174/#/login
3. Enter credentials:
   ```
   Institution ID: CRYPTO001
   Password: test123
   ```
4. **Keep Console open**
5. Click **Login**

### Expected Results:
```
Console should show:
📥 Loading keys from localStorage
✓ Keys loaded successfully
✓ Signing key imported
✓ Encryption key imported
🔐 Crypto initialized: Keys loaded
```

### Verification:
- [ ] Console shows key loading messages
- [ ] Login succeeds
- [ ] User logged in
- [ ] Keys loaded from localStorage

### Result: ___________

---

## 📋 Test 3: Navigate to Elections

### Steps:
1. Click on **Elections** in navigation menu
2. You should see "Crypto Test Election"
3. Click on the election

### Expected Results:
- Election details displayed
- 3 candidates listed:
  - Alice Johnson
  - Bob Smith
  - Carol Williams
- "Vote" button available

### Verification:
- [ ] Election visible
- [ ] Candidates displayed
- [ ] Vote button present

### Result: ___________

---

## 📋 Test 4: Cast Encrypted Vote (THE BIG TEST!)

### Steps:
1. Select a candidate (e.g., **Alice Johnson**)
2. **Keep Console open - THIS IS IMPORTANT**
3. Click **Vote** button
4. **Watch the console carefully**

### Expected Console Output:
```
🗳️ Preparing to vote...
🔐 Keys loaded: true
📊 Election ID: 4
👤 Candidate ID: [candidate_id]

Step 1: Generating nullifier...
✓ Nullifier generated: a4b3c2d1e0f9...

Step 2: Encrypting ballot...
✓ Ballot encrypted with election public key

Step 3: Signing vote package...
✓ Vote package signed with ECDSA

Step 4: Submitting to backend...
📤 Sending encrypted vote package:
  - Encrypted Ballot: [base64 data]
  - Nullifier: [hash]
  - Signature: [base64 data]
  - Public Key: [base64 data]
  - Timestamp: [unix timestamp]

✅ Vote submitted successfully!
📜 Receipt received
```

### Backend Console Should Show:
```
Processing vote with client-side cryptography
⚠️  Using simplified signature verification (development mode)
✅ Signature verified, nullifier checked
```

### Expected UI:
- [ ] Receipt modal/component appears
- [ ] Shows **Transaction Hash**
- [ ] Shows **Nullifier** (partially hidden for privacy)
- [ ] Shows **Signature** (first few characters)
- [ ] Shows **Timestamp**
- [ ] **Download Receipt** button available
- [ ] **Print Receipt** button available

### Verification:
- [ ] Vote button clicked
- [ ] Console shows encryption process
- [ ] Console shows signature creation
- [ ] Console shows successful submission
- [ ] Receipt displayed
- [ ] No errors in console

**Screenshot the console output!** 📸  
**Screenshot the receipt!** 📸

### Result: ___________

---

## 📋 Test 5: Verify Vote in Database

### Steps:
1. Open terminal
2. Run:
   ```bash
   cd /h/Voting/backend
   node check-vote.js
   ```

### Expected Output:
```
Checking votes in database...

✓ Found 1 vote(s) in database

============================================================
Vote #1
============================================================
  Database ID:       [id]
  Election ID:       4
  Transaction Hash:  [first 16 chars]...
  Block Index:       [number]
  Timestamp:         [datetime]

  Nullifier (first 40 chars):
    a4b3c2d1e0f9...

  Encrypted Ballot (first 60 chars):
    [random base64 data]...

  Signature (first 40 chars):
    [base64 ECDSA signature]...

  Public Key (first 40 chars):
    eyJrdHkiOiJFQyIs...

============================================================
✅ Encrypted voting system is working correctly!
============================================================
```

### Verification:
- [ ] Vote found in database
- [ ] Ballot is encrypted (random-looking data)
- [ ] Signature is present
- [ ] Nullifier matches what you saw
- [ ] Public key stored

**Screenshot the database output!** 📸

### Result: ___________

---

## 📋 Test 6: Double-Vote Prevention

### Steps:
1. Try to vote again in the same election
2. Select any candidate
3. Click **Vote**

### Expected Result:
```
❌ Error message displayed:
"This nullifier has already been used (possible double-vote attempt)"
OR
"You have already voted in this election"
```

### Verification:
- [ ] Error message shown
- [ ] Vote rejected
- [ ] Cannot vote twice

### Result: ___________

---

## 📋 Test 7: Download Receipt

### Steps:
1. If receipt is still open, click **Download Receipt**
2. If closed, the receipt should be in your downloads or in app

### Expected:
- [ ] JSON file downloaded
- [ ] Contains transaction hash
- [ ] Contains nullifier
- [ ] Contains signature
- [ ] Contains timestamp

**Save the receipt file!**

### Result: ___________

---

## 📊 Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Registration + Key Gen | ⬜ | |
| 2. Login + Key Load | ⬜ | |
| 3. Navigate to Elections | ⬜ | |
| 4. Cast Encrypted Vote | ⬜ | |
| 5. Verify in Database | ⬜ | |
| 6. Double-Vote Prevention | ⬜ | |
| 7. Download Receipt | ⬜ | |

**Legend:** ✅ Pass | ❌ Fail | ⚠️ Warning | ⬜ Not tested

---

## 🐛 Troubleshooting

### Problem: "Keys not loaded"
**Solution:** 
- Logout and login again
- Check localStorage has 4 keys
- Clear browser cache and re-register

### Problem: "Cannot read encryption_key"
**Solution:**
- Check console for errors
- Verify localStorage has keys
- Re-register if needed

### Problem: "User not registered for election"
**Solution:**
```bash
cd /h/Voting/backend
node create-test-election.js
```

### Problem: "Invalid signature"
**This is OK** - we're using simplified verification in dev mode

### Problem: Network errors
**Check:**
- Backend running on port 3000
- Frontend can reach backend
- CORS is enabled

---

## 📸 Evidence to Collect

1. **Screenshot: Registration form filled**
2. **Screenshot: Console showing key generation**
3. **Screenshot: localStorage with 4 keys**
4. **Screenshot: Login success**
5. **Screenshot: Election list**
6. **Screenshot: Vote page with candidates**
7. **Screenshot: Console during vote encryption**
8. **Screenshot: Vote receipt**
9. **Screenshot: Database verification (terminal)**
10. **Screenshot: Double-vote prevention error**

---

## ✅ Success Criteria

All tests pass if:
- ✅ Keys generate during registration
- ✅ Keys load during login
- ✅ Vote encrypts client-side
- ✅ Vote signs with ECDSA
- ✅ Backend accepts encrypted vote
- ✅ Backend verifies signature
- ✅ Database stores encrypted ballot
- ✅ Receipt shows crypto proof
- ✅ Double-vote prevented
- ✅ No errors in console

---

**Ready to start testing!** 🚀

**Open:** http://localhost:5174  
**DevTools:** Press F12  
**Console:** Ready to watch the magic happen!
