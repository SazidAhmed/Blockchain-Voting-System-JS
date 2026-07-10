# Quick Start: Testing Client-Side Cryptography

## 🚀 Quick Test (5 minutes)

### Prerequisites
- Frontend server running (`npm run dev` in `/frontend`)
- Modern browser (Chrome, Firefox, Safari, Edge)

### Test 1: Registration with Key Generation (2 min)

1. **Open the application:**
   ```
   http://localhost:5173
   ```

2. **Navigate to Register:**
   - Click "Register" link or go to `/register`

3. **Fill the form:**
   ```
   Name: Test User
   Email: test@university.edu
   Student ID: S12345
   Password: TestPass123!
   Confirm Password: TestPass123!
   ```

4. **Submit and observe:**
   - Watch for "🔐 Generating cryptographic keys..." message
   - Check browser console (F12) for:
     ```
     Generating cryptographic keypairs...
     Keypairs generated successfully
     Keys stored securely
     ```

5. **Verify key storage:**
   - Open browser DevTools (F12) → Application tab → Local Storage
   - Look for key: `voting_keys_S12345`
   - You should see a JSON object with encrypted keys

✅ **Expected:** Keys generated and stored successfully

---

### Test 2: Browser Console Crypto Tests (2 min)

1. **Open browser console (F12)**

2. **Load the test suite:**
   - Copy contents of `frontend/src/services/crypto.test.js`
   - Paste into console
   - Press Enter

3. **Run tests:**
   ```javascript
   // Run all tests
   await cryptoTests.runAllTests()
   
   // Should see:
   // 🧪 Test 1: Key Generation
   // ✅ Key generation: PASSED
   // 🧪 Test 2: Key Export/Import
   // ✅ Key export/import: PASSED
   // ... (8 tests total)
   // 📊 Test Results: 8/8 passed
   ```

4. **Run individual test:**
   ```javascript
   // Test ballot encryption
   await cryptoTests.testBallotEncryption()
   ```

✅ **Expected:** All 8 tests pass

---

### Test 3: End-to-End Voting (1 min)

⚠️ **Note:** Requires backend to be updated with crypto support

1. **Login with test account:**
   ```
   Username: test@university.edu
   Password: TestPass123!
   ```

2. **Check console for:**
   ```
   User keys loaded successfully
   ```

3. **Navigate to an election and vote:**
   - Go to Elections list
   - Click on an active election
   - Click "Vote"
   - Select a candidate
   - Observe: "✓ Cryptographic Keys Loaded" status

4. **Submit vote:**
   - Click "Submit Vote"
   - Watch for: "🔐 Encrypting your vote... Please wait."
   - Vote receipt should display with:
     - Transaction Hash
     - Nullifier
     - Digital Signature
     - Timestamp

5. **Download receipt:**
   - Click "💾 Download Receipt"
   - Open JSON file
   - Verify structure

✅ **Expected:** Vote encrypted and submitted with receipt

---

## 🧪 Detailed Testing

### Manual Crypto Service Testing

Open browser console on any page:

#### Test Key Generation
```javascript
// Import crypto service (if available globally)
const crypto = await import('./src/services/crypto.js')
const cryptoService = crypto.default

// Generate keys
const keys = await cryptoService.generateUserKeypairs()
console.log('Keys generated:', keys)
```

#### Test Encryption
```javascript
// Generate keys
const keys = await cryptoService.generateUserKeypairs()

// Test data
const ballot = { candidateId: 123, electionId: 'test-election' }

// Encrypt
const encrypted = await cryptoService.encryptBallot(ballot, keys.encryption.publicKey)
console.log('Encrypted ballot:', encrypted)
console.log('Length:', encrypted.length, 'characters')
```

#### Test Signatures
```javascript
// Generate keys
const keys = await cryptoService.generateUserKeypairs()

// Test data
const data = { test: 'vote data' }

// Sign
const signature = await cryptoService.signData(data, keys.signing.privateKey)
console.log('Signature:', signature)

// Verify
const valid = await cryptoService.verifySignature(signature, data, keys.signing.publicKey)
console.log('Signature valid:', valid) // Should be true
```

#### Test Nullifier
```javascript
// Generate keys
const keys = await cryptoService.generateUserKeypairs()

// Generate nullifier
const nullifier1 = await cryptoService.generateNullifier(keys.signing.privateKey, 'election-1')
const nullifier2 = await cryptoService.generateNullifier(keys.signing.privateKey, 'election-1')
const nullifier3 = await cryptoService.generateNullifier(keys.signing.privateKey, 'election-2')

console.log('Nullifier 1:', nullifier1)
console.log('Nullifier 2:', nullifier2)
console.log('Same?', nullifier1 === nullifier2) // Should be true (deterministic)
console.log('Nullifier 3:', nullifier3)
console.log('Different?', nullifier1 !== nullifier3) // Should be true
```

#### Test Complete Vote Package
```javascript
// Generate voter keys
const voterKeys = await cryptoService.generateUserKeypairs()

// Generate election keys
const electionKeys = await cryptoService.generateUserKeypairs()

// Create vote package
const votePackage = await cryptoService.createVotePackage(
  { candidateId: 42 },
  'election-test',
  voterKeys,
  electionKeys.encryption.publicKey
)

console.log('Vote Package:', {
  encryptedBallot: votePackage.encryptedBallot.substring(0, 50) + '...',
  nullifier: votePackage.nullifier,
  signature: votePackage.signature.substring(0, 50) + '...',
  timestamp: new Date(votePackage.timestamp).toISOString()
})
```

---

## 🔍 Verification Checklist

### ✅ Registration Phase
- [ ] Key generation message appears
- [ ] Console shows "Keys generated successfully"
- [ ] localStorage contains voting_keys_{userId}
- [ ] Registration completes successfully
- [ ] No errors in console

### ✅ Login Phase
- [ ] Console shows "Loading user keys..."
- [ ] Console shows "User keys loaded successfully"
- [ ] No key-related errors
- [ ] Login completes successfully

### ✅ Voting Phase
- [ ] "✓ Cryptographic Keys Loaded" status shows
- [ ] Can select candidate
- [ ] "Submit Vote" button is enabled
- [ ] Encryption message appears when submitting
- [ ] Console shows "Creating encrypted vote package..."
- [ ] Console shows "Vote encrypted successfully"

### ✅ Receipt Display
- [ ] Vote receipt component renders
- [ ] Transaction hash displays
- [ ] Nullifier displays (64 hex characters)
- [ ] Signature displays
- [ ] Timestamp is correct
- [ ] Download button works
- [ ] Print button works (opens print dialog)

### ✅ Security Checks
- [ ] Encrypted ballot is not readable plaintext
- [ ] Private keys are not visible in UI
- [ ] Keys are cleared from memory on logout
- [ ] Nullifiers are deterministic (same user + election)
- [ ] Signatures verify correctly

---

## 🐛 Troubleshooting

### Issue: "Failed to generate signing keypair"
**Cause:** Browser doesn't support Web Crypto API  
**Solution:** Use modern browser (Chrome 37+, Firefox 34+, Safari 11+)

### Issue: "No keys found for user"
**Cause:** Keys not generated during registration  
**Solution:** Re-register or check console for errors

### Issue: "Cryptographic keys not loaded"
**Cause:** Keys not loaded on login  
**Solution:** Check if keys exist in localStorage, try re-login

### Issue: "Failed to encrypt ballot"
**Cause:** Invalid public key format  
**Solution:** Ensure election has valid RSA public key

### Issue: Test suite not found
**Cause:** Test file not loaded  
**Solution:** Copy entire crypto.test.js content into console

### Issue: localStorage keys corrupted
**Cause:** Manual editing or browser issue  
**Solution:** Clear localStorage and re-register
```javascript
localStorage.clear()
```

---

## 📊 Performance Benchmarks

Run performance tests in console:

```javascript
// Benchmark key generation
console.time('Key Generation')
const keys = await cryptoService.generateUserKeypairs()
console.timeEnd('Key Generation')
// Expected: 50-200ms

// Benchmark encryption
console.time('Ballot Encryption')
const encrypted = await cryptoService.encryptBallot({test: 'data'}, keys.encryption.publicKey)
console.timeEnd('Ballot Encryption')
// Expected: 5-20ms

// Benchmark signing
console.time('Digital Signature')
const signature = await cryptoService.signData('test', keys.signing.privateKey)
console.timeEnd('Digital Signature')
// Expected: 5-15ms

// Benchmark nullifier
console.time('Nullifier Generation')
const nullifier = await cryptoService.generateNullifier(keys.signing.privateKey, 'test')
console.timeEnd('Nullifier Generation')
// Expected: 2-10ms
```

**Expected Total Vote Processing Time:** 50-250ms

---

## 🎯 Success Criteria

Your implementation is working correctly if:

1. ✅ All 8 crypto tests pass
2. ✅ Keys generate during registration
3. ✅ Keys load during login
4. ✅ Ballots encrypt successfully
5. ✅ Votes create valid signatures
6. ✅ Nullifiers are deterministic
7. ✅ Vote receipts display correctly
8. ✅ No crypto-related errors in console

---

## 🚀 Ready for Production?

### ✅ Current Status: Development/Demo Ready

**Safe to use for:**
- Development testing
- Demos
- Proof of concept
- Academic research

**NOT ready for production until:**
- [ ] PBKDF2 key derivation implemented
- [ ] AES-GCM key encryption added
- [ ] HSM integration complete
- [ ] External security audit performed
- [ ] MFA implemented
- [ ] Key rotation strategy defined
- [ ] Incident response plan created

See `CRYPTO_IMPLEMENTATION.md` for production checklist.

---

## 📞 Support

**Documentation:**
- `CRYPTO_IMPLEMENTATION.md` - Full technical guide
- `CRYPTO_IMPLEMENTATION_SUMMARY.md` - High-level overview
- `crypto.test.js` - Test examples

**Issues?**
Check browser console for detailed error messages and stack traces.

---

**Last Updated:** October 20, 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready for Testing
