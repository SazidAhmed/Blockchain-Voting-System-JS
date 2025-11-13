# Screenshots Checklist for Presentation

**Project:** University Blockchain Voting System  
**Presentation Date:** TBD  
**Purpose:** Academic demonstration of blockchain voting security features  
**Last Updated:** November 13, 2025

---

## Overview

This document lists all screenshots required for the academic presentation of the blockchain voting system. Each screenshot serves to demonstrate a specific security feature or system component that was tested and validated on November 13, 2025.

---

## Priority 1: Double-Vote Prevention (8 Screenshots)

### Screenshot 1: User Registration Success
**Category:** Security - Authentication  
**Priority:** HIGH  
**Status:** ⏸️ PENDING

**What to Capture:**
- Frontend registration form after successful submission
- User: TEST2025ALPHA
- Success message: "Registration successful"
- Auto-registration confirmation: "You are registered for 2 elections"

**Browser View:**
- URL: `http://localhost:5173/register`
- Viewport: Full screen (1920x1080 recommended)
- Browser Console: OPEN (show cryptographic key generation)

**Console Must Show:**
- "Generating ECDSA keypair..."
- "Generating RSA keypair..."
- "Keys saved to localStorage"
- Public key values (first 40 characters)

**Filename:** `01_registration_success_TEST2025ALPHA.png`

**Technical Purpose:**
Demonstrates client-side key generation and auto-registration feature.

---

### Screenshot 2: Login with Cryptographic Keys Loaded
**Category:** Security - Key Management  
**Priority:** HIGH  
**Status:** ⏸️ PENDING

**What to Capture:**
- Browser console after successful login
- User: TEST2025ALPHA
- Console messages showing keys loaded from localStorage

**Browser View:**
- URL: `http://localhost:5173/login`
- Browser Console: OPEN

**Console Must Show:**
- "Loading user keys from localStorage..."
- "ECDSA keypair loaded"
- "RSA keypair loaded"
- "User authenticated: TEST2025ALPHA"

**Filename:** `02_login_keys_loaded_TEST2025ALPHA.png`

**Technical Purpose:**
Validates that cryptographic keys persist across sessions and are loaded correctly.

---

### Screenshot 3: Voting Page - First Vote
**Category:** Core Workflow - Voting  
**Priority:** HIGH  
**Status:** ⏸️ PENDING

**What to Capture:**
- Voting interface showing active election
- Election: "Student Union President Election 2025"
- Candidate selection visible
- "Submit Vote" button visible

**Browser View:**
- URL: `http://localhost:5173/elections/1/vote`
- Viewport: Full screen
- Browser Console: CLOSED (focus on UI)

**UI Elements to Show:**
- Election title
- List of candidates (at least 3 visible)
- Selected candidate highlighted
- Submit button (not yet clicked)
- User info in header (TEST2025ALPHA)

**Filename:** `03_voting_page_first_vote.png`

**Technical Purpose:**
Shows user-friendly voting interface before vote submission.

---

### Screenshot 4: Vote Receipt - First Vote Success
**Category:** Core Workflow - Vote Confirmation  
**Priority:** CRITICAL  
**Status:** ⏸️ PENDING

**What to Capture:**
- Vote receipt modal after successful vote
- Transaction hash displayed
- Vote confirmation message

**Browser View:**
- URL: `http://localhost:5173/elections/1/vote`
- Modal/Dialog: OPEN
- Browser Console: OPEN

**Receipt Must Show:**
- ✅ Success message: "Your vote has been recorded"
- Transaction Hash: `7b3782b526974c0f580e4f958b4998b2f446b323d0827e0dd52f70b723c6e5fb`
- Nullifier Hash: `84ca53964d72f41fa790ea42909803299727ef37ce621d0c29b1b7b656769383`
- Timestamp: 2025-11-13 09:14:28 (or similar)
- Instructions: "Save this receipt for your records"

**Console Must Show:**
- "Vote submitted successfully"
- "Transaction hash received"
- Receipt data object

**Filename:** `04_vote_receipt_first_vote_TEST2025ALPHA.png`

**Technical Purpose:**
Demonstrates successful vote submission and transaction hash generation. This is the MOST IMPORTANT screenshot.

---

### Screenshot 5: Double-Vote Attempt - Error Message
**Category:** Security - Double-Vote Prevention  
**Priority:** CRITICAL  
**Status:** ⏸️ PENDING

**What to Capture:**
- Error message after attempting to vote twice
- Same election, same user (TEST2025ALPHA)

**Browser View:**
- URL: `http://localhost:5173/elections/1/vote`
- Error dialog/toast: VISIBLE
- Browser Console: OPEN

**Error Message Must Show:**
- ❌ "You have already voted in this election"
- HTTP status: 400 Bad Request
- Clear indication that vote was rejected

**Console Must Show:**
- "POST /api/elections/1/vote 400 (Bad Request)"
- Error response: `{"error": "You have already voted in this election"}`
- No vote receipt generated

**Filename:** `05_double_vote_rejected_TEST2025ALPHA.png`

**Technical Purpose:**
Validates that double-vote prevention is working. This proves the core security feature.

---

### Screenshot 6: Database - votes_meta Table After First Vote
**Category:** Database - Vote Storage  
**Priority:** HIGH  
**Status:** ⏸️ PENDING

**What to Capture:**
- phpMyAdmin view of votes_meta table
- Single vote record visible
- All columns displayed

**Access:**
- URL: `http://localhost:8080`
- Database: `secure_voting_db`
- Table: `votes_meta`
- View: Browse (all records)

**Columns to Display:**
- `id`: 1
- `election_id`: 1
- `nullifier_hash`: 84ca53964d72f41fa790ea42909803299727ef37ce621d0c29b1b7b656769383
- `tx_hash`: 7b3782b526974c0f580e4f958b4998b2f446b323d0827e0dd52f70b723c6e5fb
- `encrypted_ballot`: (full text visible)
- `signature`: (full text visible)
- `timestamp`: 2025-11-13 09:14:28

**Filename:** `06_database_votes_meta_single_vote.png`

**Technical Purpose:**
Shows that vote data is properly stored in database with transaction hash.

---

### Screenshot 7: Database - voter_registrations Status Update
**Category:** Database - Registration Status  
**Priority:** HIGH  
**Status:** ⏸️ PENDING

**What to Capture:**
- phpMyAdmin view of voter_registrations table
- TEST2025ALPHA record showing status = 'voted'

**Access:**
- URL: `http://localhost:8080`
- Database: `secure_voting_db`
- Table: `voter_registrations`
- Filter: WHERE user_id = 8 (TEST2025ALPHA)

**Columns to Display:**
- `id`: (auto-increment)
- `user_id`: 8
- `election_id`: 1
- `status`: **voted** (not 'registered')
- `registration_token`: (UUID visible)
- `registration_date`: (timestamp)

**Filename:** `07_database_voter_status_voted.png`

**Technical Purpose:**
Demonstrates that voter status is updated after casting vote (first layer of double-vote prevention).

---

### Screenshot 8: Database - audit_logs Double-Vote Attempt
**Category:** Security - Audit Trail  
**Priority:** MEDIUM  
**Status:** ⏸️ PENDING

**What to Capture:**
- phpMyAdmin view of audit_logs table
- DOUBLE_VOTE_ATTEMPT event visible

**Access:**
- URL: `http://localhost:8080`
- Database: `secure_voting_db`
- Table: `audit_logs`
- Filter: WHERE event_type = 'DOUBLE_VOTE_ATTEMPT'

**Columns to Display:**
- `id`: (auto-increment)
- `event_type`: DOUBLE_VOTE_ATTEMPT
- `event_category`: SECURITY
- `user_id`: 8
- `target_id`: 1
- `details`: {"reason": "User already voted", "registrationStatus": "voted"}
- `severity`: warning
- `timestamp`: 2025-11-13 09:14:38

**Filename:** `08_audit_log_double_vote_attempt.png`

**Technical Purpose:**
Proves that all security events are logged for forensic analysis.

---

## Priority 2: Transaction Hash Verification (6 Screenshots)

### Screenshot 9: Vote Receipt - TEST2025BETA
**Category:** Core Workflow - Vote Confirmation  
**Priority:** CRITICAL  
**Status:** ⏸️ PENDING

**What to Capture:**
- Vote receipt modal for second test user
- Transaction hash: `8de69bbecfc6994c135fcc9e16da7fcca061b0a928acc91b921fc93b3da90a0d`

**Browser View:**
- URL: `http://localhost:5173/elections/1/vote`
- User: TEST2025BETA
- Modal/Dialog: OPEN
- Browser Console: OPEN

**Receipt Must Show:**
- ✅ Success message
- Transaction Hash: `8de69bbe...` (full hash visible)
- Nullifier Hash: `e27ded9c...` (full hash visible)
- Timestamp
- 64-character hex format clearly visible

**Console Must Show:**
- Vote data object with transaction hash
- API response with receipt

**Filename:** `09_vote_receipt_TEST2025BETA_hash_verification.png`

**Technical Purpose:**
Provides second example of transaction hash for comparison and uniqueness verification.

---

### Screenshot 10: Database - Both Transaction Hashes
**Category:** Database - Hash Storage  
**Priority:** HIGH  
**Status:** ⏸️ PENDING

**What to Capture:**
- phpMyAdmin view of votes_meta table
- Both votes visible (TEST2025ALPHA and TEST2025BETA)
- Focus on tx_hash column

**Access:**
- URL: `http://localhost:8080`
- Database: `secure_voting_db`
- Table: `votes_meta`
- Sort: By id ASC

**Data to Show:**
| id | election_id | tx_hash | timestamp |
|----|-------------|---------|-----------|
| 1  | 1           | 7b3782b5... | 09:14:28 |
| 2  | 1           | 8de69bbe... | 09:32:53 |

**Highlight:**
- Both hashes are different (uniqueness)
- Both hashes are 64 characters
- Both follow same format

**Filename:** `10_database_both_transaction_hashes.png`

**Technical Purpose:**
Demonstrates hash uniqueness and consistent formatting.

---

### Screenshot 11: Backend Code - Hash Generation Function
**Category:** Code - Implementation  
**Priority:** MEDIUM  
**Status:** ⏸️ PENDING

**What to Capture:**
- VS Code editor showing blockchain-node/index.js
- Lines 215-223 (hash generation code)

**Editor View:**
- File: `h:\Voting\blockchain-node\index.js`
- Line numbers: VISIBLE
- Syntax highlighting: ENABLED

**Code to Highlight:**
```javascript
// Lines 215-223
const txData = JSON.stringify({
    electionId: vote.electionId,
    nullifier: vote.nullifier,
    encryptedBallot: vote.encryptedBallot,
    timestamp: vote.timestamp || Date.now()
});
const transactionHash = crypto.SHA256(txData).toString();
```

**Filename:** `11_code_hash_generation_function.png`

**Technical Purpose:**
Shows how transaction hash is generated deterministically from vote data.

---

### Screenshot 12: Blockchain API Response - Transaction Hash
**Category:** API - Blockchain Integration  
**Priority:** MEDIUM  
**Status:** ⏸️ PENDING

**What to Capture:**
- Browser or Postman showing blockchain node API response
- Endpoint: GET `http://localhost:3001/chain`

**Request:**
```
GET http://localhost:3001/chain
```

**Response to Show:**
```json
{
  "chain": [
    {
      "index": 0,
      "timestamp": "...",
      "transactions": [],
      "proof": 100,
      "previousHash": "0"
    },
    {
      "index": 1,
      "timestamp": "2025-11-13T09:14:28.000Z",
      "transactions": [
        {
          "transactionHash": "7b3782b526974c0f580e4f958b4998b2f446b323d0827e0dd52f70b723c6e5fb",
          "electionId": "1",
          "nullifier": "84ca53964d72f41fa790ea42909803299727ef37ce621d0c29b1b7b656769383",
          ...
        }
      ]
    }
  ]
}
```

**Filename:** `12_blockchain_api_transaction_hash.png`

**Technical Purpose:**
Proves that transaction hash is stored in blockchain and accessible via API.

---

### Screenshot 13: Browser Console - Vote Submission Details
**Category:** Frontend - Cryptographic Operations  
**Priority:** HIGH  
**Status:** ⏸️ PENDING

**What to Capture:**
- Browser console during vote submission
- Expanded vote object showing all cryptographic data

**Browser View:**
- URL: `http://localhost:5173/elections/1/vote`
- Console: OPEN
- Vote object: EXPANDED (show all properties)

**Console Must Show:**
```javascript
{
  electionId: "1",
  candidateId: 1,
  nullifier: "84ca53964d72f41fa790ea42909803299727ef37ce621d0c29b1b7b656769383",
  encryptedBallot: "eyJjYW5kaWRhdGVJZCI6MSwidGltZXN0YW1wIjoxNzYzMDI2MDY4ODI3LCJlbGVjdGlvbklkIjoiMSJ9",
  signature: "MEUCIQCRmk5z...",
  publicKey: "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...",
  timestamp: 1763026068827
}
```

**Filename:** `13_console_vote_submission_details.png`

**Technical Purpose:**
Shows complete vote package before submission, including cryptographic components.

---

### Screenshot 14: Backend Logs - Signature Verification Success
**Category:** Backend - Security Validation  
**Priority:** MEDIUM  
**Status:** ⏸️ PENDING

**What to Capture:**
- Terminal/VS Code showing backend logs
- Signature verification success message

**Terminal View:**
```bash
docker logs voting-backend -f
```

**Logs Must Show:**
```
[2025-11-13T09:14:28.000Z] INFO: Signature verification started
[2025-11-13T09:14:28.010Z] INFO: Public key recovered from signature
[2025-11-13T09:14:28.015Z] INFO: Signature verified successfully
[2025-11-13T09:14:28.020Z] INFO: Vote processing started for election 1
[2025-11-13T09:14:28.045Z] INFO: Vote stored with transaction hash: 7b3782b5...
```

**Filename:** `14_backend_logs_signature_verification.png`

**Technical Purpose:**
Demonstrates backend security validation process.

---

## Priority 3: System Architecture (4 Screenshots)

### Screenshot 15: Docker Containers - All Running
**Category:** Infrastructure - Docker  
**Priority:** MEDIUM  
**Status:** ⏸️ PENDING

**What to Capture:**
- Terminal showing `docker ps` output
- All 5 containers healthy

**Command:**
```bash
docker ps
```

**Output Must Show:**
```
CONTAINER ID   IMAGE                  STATUS         PORTS                    NAMES
abc123...      voting-mysql           Up 2 hours     0.0.0.0:3306->3306/tcp   voting-mysql
def456...      voting-backend         Up 2 hours     0.0.0.0:3000->3000/tcp   voting-backend
ghi789...      voting-frontend        Up 2 hours     0.0.0.0:5173->80/tcp     voting-frontend
jkl012...      voting-blockchain      Up 2 hours     0.0.0.0:3001->3001/tcp   voting-blockchain
mno345...      phpmyadmin/phpmyadmin  Up 2 hours     0.0.0.0:8080->80/tcp     voting-phpmyadmin
```

**Filename:** `15_docker_containers_all_running.png`

**Technical Purpose:**
Shows complete system architecture with all microservices operational.

---

### Screenshot 16: Database Schema - ERD Overview
**Category:** Database - Architecture  
**Priority:** LOW  
**Status:** ⏸️ PENDING

**What to Capture:**
- phpMyAdmin Designer view or manual ERD diagram
- Showing relationships between tables

**Access:**
- URL: `http://localhost:8080`
- Database: `secure_voting_db`
- View: Designer (if available) or Structure view of multiple tables

**Tables to Show:**
- users
- voter_registrations
- elections
- candidates
- votes_meta
- audit_logs
- blockchain_nodes

**Relationships to Highlight:**
- users → voter_registrations (one-to-many)
- elections → voter_registrations (one-to-many)
- elections → votes_meta (one-to-many)
- elections → candidates (one-to-many)

**Filename:** `16_database_schema_erd.png`

**Technical Purpose:**
Provides high-level view of database design and relationships.

---

### Screenshot 17: Frontend Dashboard - Election List
**Category:** UI - User Interface  
**Priority:** MEDIUM  
**Status:** ⏸️ PENDING

**What to Capture:**
- Main dashboard showing all available elections
- User logged in (any test user)

**Browser View:**
- URL: `http://localhost:5173/elections` or `http://localhost:5173/dashboard`
- Viewport: Full screen
- Browser Console: CLOSED

**UI Must Show:**
- Header with user info and logout button
- List of elections:
  - ✅ Student Union President Election 2025 (Active) - "Vote Now" button
  - ⏸️ Faculty Senate Election 2025 (Pending) - "Registration Open"
  - ✅ Board of Trustees Election 2025 (Completed) - "View Results"
- Vote status indicators
- Clean, professional UI design

**Filename:** `17_frontend_dashboard_elections.png`

**Technical Purpose:**
Demonstrates user-friendly interface and election management.

---

### Screenshot 18: System Architecture Diagram
**Category:** Documentation - Architecture  
**Priority:** LOW  
**Status:** ⏸️ PENDING

**What to Create:**
- High-level architecture diagram showing all components
- Can be created using draw.io, Lucidchart, or PowerPoint

**Components to Include:**
1. **Frontend Layer:**
   - Vue.js SPA (Port 5173)
   - Web Crypto API
   - LocalStorage (Key Storage)

2. **Backend Layer:**
   - Express API Server (Port 3000)
   - JWT Authentication
   - ECDSA Verification

3. **Blockchain Layer:**
   - Custom Blockchain Node (Port 3001)
   - PoW Consensus
   - LevelDB Storage

4. **Database Layer:**
   - MySQL 8.0 (Port 3306)
   - phpMyAdmin (Port 8080)

5. **Data Flow:**
   - User → Frontend → Backend → Blockchain
   - User → Frontend → Backend → Database
   - Backend → Blockchain (Vote submission)
   - Backend → Database (Vote metadata)

**Filename:** `18_system_architecture_diagram.png`

**Technical Purpose:**
Provides comprehensive view of system design for presentation.

---

## Optional Screenshots (Nice to Have)

### Screenshot 19: Monitoring Dashboard (If Implemented)
**Category:** Operations - Monitoring  
**Priority:** LOW  
**Status:** ⏸️ OPTIONAL

**What to Capture:**
- Grafana dashboard (if available)
- Metrics: Request rate, response time, active users

**Access:**
- URL: `http://localhost:3002` (if monitoring enabled)

**Filename:** `19_monitoring_dashboard.png`

---

### Screenshot 20: Election Results Page
**Category:** UI - Results Display  
**Priority:** LOW  
**Status:** ⏸️ OPTIONAL

**What to Capture:**
- Results page for completed election
- Vote counts (if decryption keys available)

**Filename:** `20_election_results_page.png`

---

## Screenshot Capture Guidelines

### Technical Requirements

**Resolution:**
- Minimum: 1920x1080 (Full HD)
- Recommended: 2560x1440 (2K) for high-quality presentations
- Format: PNG (lossless compression)

**Browser:**
- Chrome or Edge (latest version)
- Dev Tools open where specified
- No browser extensions visible (use incognito mode)

**Image Quality:**
- No compression artifacts
- Text must be readable
- No personal information visible (beyond test data)

**Editing:**
- Add red boxes or arrows to highlight key elements (optional)
- Add numbered callouts if presenting specific features
- Ensure consistent styling across all screenshots

### Capture Tools

**Windows:**
- Windows Snipping Tool (Win + Shift + S)
- Greenshot (free tool)
- ShareX (advanced features)

**Browser:**
- Chrome DevTools: Capture full page screenshot (Ctrl + Shift + P → "Capture screenshot")
- Firefox: Screenshot tool (Ctrl + Shift + S)

**Database:**
- phpMyAdmin: Use browser screenshot tools
- Ensure all relevant columns are visible

### Organization

**Folder Structure:**
```
h:\Voting\Presentation\
├── Screenshots\
│   ├── 01_Priority_1_Double_Vote_Prevention\
│   │   ├── 01_registration_success_TEST2025ALPHA.png
│   │   ├── 02_login_keys_loaded_TEST2025ALPHA.png
│   │   ├── ...
│   ├── 02_Priority_2_Transaction_Hash\
│   │   ├── 09_vote_receipt_TEST2025BETA_hash_verification.png
│   │   ├── ...
│   ├── 03_System_Architecture\
│   │   ├── 15_docker_containers_all_running.png
│   │   ├── ...
├── Diagrams\
│   ├── system_architecture.png
│   ├── security_flow.png
└── Documentation\
    ├── SCREENSHOTS_CHECKLIST.md (this file)
    ├── FINAL_TEST_SUMMARY.md
```

**Naming Convention:**
- Use sequential numbers: 01, 02, 03...
- Include component name: `database`, `console`, `receipt`
- Include context: `TEST2025ALPHA`, `double_vote_rejected`
- Use lowercase with underscores

---

## Completion Checklist

### Critical Screenshots (Must Have)
- [ ] Screenshot 4: Vote receipt with transaction hash (TEST2025ALPHA)
- [ ] Screenshot 5: Double-vote rejection error message
- [ ] Screenshot 9: Vote receipt with transaction hash (TEST2025BETA)
- [ ] Screenshot 10: Database showing both transaction hashes

### High Priority Screenshots (Strongly Recommended)
- [ ] Screenshot 1: User registration success
- [ ] Screenshot 2: Login with keys loaded
- [ ] Screenshot 6: Database votes_meta table
- [ ] Screenshot 7: Database voter_registrations status
- [ ] Screenshot 13: Browser console vote submission details

### Medium Priority Screenshots (Recommended)
- [ ] Screenshot 3: Voting page UI
- [ ] Screenshot 8: Audit log double-vote attempt
- [ ] Screenshot 11: Backend code hash generation
- [ ] Screenshot 12: Blockchain API response
- [ ] Screenshot 14: Backend logs signature verification
- [ ] Screenshot 15: Docker containers running
- [ ] Screenshot 17: Frontend dashboard

### Low Priority Screenshots (Nice to Have)
- [ ] Screenshot 16: Database schema ERD
- [ ] Screenshot 18: System architecture diagram
- [ ] Screenshot 19: Monitoring dashboard (optional)
- [ ] Screenshot 20: Election results page (optional)

---

## Next Steps

1. **Set Up Test Environment:**
   - Ensure all Docker containers are running
   - Verify database is in correct state (2 votes from TEST2025ALPHA and TEST2025BETA)
   - Clear browser cache and localStorage (for fresh registration screenshots)

2. **Capture Critical Screenshots:**
   - Start with Priority 1 screenshots (double-vote prevention)
   - Move to Priority 2 screenshots (transaction hash verification)
   - Finish with system architecture screenshots

3. **Review and Edit:**
   - Check that all text is readable
   - Verify no sensitive information is visible
   - Add annotations if needed (red boxes, arrows, callouts)

4. **Organize Files:**
   - Create folder structure as specified above
   - Name files according to convention
   - Create index document listing all screenshots

5. **Integrate into Presentation:**
   - Create PowerPoint or Google Slides
   - Add screenshots with captions
   - Include explanatory text for each feature
   - Practice presentation flow

---

**Estimated Time:** 2-3 hours for complete screenshot collection and organization

**Status:** Ready for execution - all test data is prepared and validated

**Last Updated:** November 13, 2025
