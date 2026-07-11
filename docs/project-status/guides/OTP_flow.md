# OTP (One-Time Password) Flow — University Voting System

## Overview

The OTP system verifies a voter's email address during registration. It is implemented entirely in the backend (`services/backend/services/otpService.js` + `services/backend/services/emailService.js`) and uses an **in-memory store** (no database table required).

---

## Flow Diagram

```text
User enters Institution ID
        │
        ▼
Backend checks institution ID exists in DB
        │
        ▼
Generate 6-digit cryptographically secure OTP
        │
        ▼
Store OTP in memory (Map keyed by Institution ID)
        │
        ▼
Send OTP to registered email via SMTP (Gmail)
        │
        ▼
User enters OTP code in the frontend
        │
        ▼
Backend verifies code from memory store
        │
   ┌────┴────┐
 Valid      Invalid
   │            │
   ▼            ▼
Mark as      Decrement attempts
verified     (max 3 tries)
   │
   ▼
User completes registration form
        │
        ▼
Backend checks isVerified(institutionId) → true
        │
        ▼
Account created in database
        │
        ▼
OTP entry deleted from memory (consumed)
```

---

## Step-by-Step Details

### Step 1 — Request OTP (`POST /api/users/send-otp`)

- User submits their **Institution ID** (e.g. `STU00002`).
- Backend looks up the member in the database and retrieves their registered email.
- A **6-digit OTP** is generated using `crypto.randomBytes()` (cryptographically secure).
- The OTP is stored in an in-memory `Map`:

  ```js
  {
    code: "476294",
    email: "sazidahmed.edu@gmail.com",
    expiresAt: <now + 10 minutes>,
    createdAt: <now>,
    attempts: 0,
    verified: false
  }
  ```

- The email is sent via **Gmail SMTP** using `nodemailer`.
- A **masked email** (e.g. `s****u@gmail.com`) is returned to the frontend for display.
- A **60-second cooldown** is enforced between OTP requests to prevent spam.

### Step 2 — Verify OTP (`POST /api/users/verify-otp`)

- User submits their **Institution ID** + the **6-digit code**.
- Backend looks up the entry in the in-memory Map:
  - If not found → error: _"No verification code found. Please request a new one."_
  - If expired → entry deleted → error: _"Verification code has expired."_
  - If max attempts exceeded → entry deleted → error: _"Too many failed attempts."_
- Code is compared using **`crypto.timingSafeEqual()`** to prevent timing attacks.
- On success → entry is marked `verified: true`, `verifiedAt: <now>`.

### Step 3 — Complete Registration (`POST /api/users/register`)

- Backend calls `otpService.isVerified(institutionId)`.
- The verified status is valid for **15 minutes** after verification.
- If not verified → registration is blocked.
- If verified → account is created in the database.
- `otpService.consumeVerification(institutionId)` deletes the OTP entry (one-time use).

---

## Security Features

| Feature            | Detail                                               |
| ------------------ | ---------------------------------------------------- |
| Code length        | 6 digits                                             |
| Code generation    | `crypto.randomBytes()` — cryptographically secure    |
| Code comparison    | `crypto.timingSafeEqual()` — prevents timing attacks |
| Expiry             | 10 minutes from generation                           |
| Max attempts       | 3 wrong tries before invalidation                    |
| Resend cooldown    | 60 seconds between requests                          |
| Post-verify window | 15 minutes to complete registration                  |
| One-time use       | OTP is deleted after successful registration         |

---

## Email Configuration

| Environment     | Config                                                           |
| --------------- | ---------------------------------------------------------------- |
| **Development** | Ethereal fake SMTP — emails viewable at <https://ethereal.email> |
| **Production**  | Gmail SMTP (`smtp.gmail.com:587`) using an App Password          |

Environment variables required for production (in `services/backend/.env`):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=techminate@gmail.com
SMTP_PASS=<16-character Gmail App Password>
SMTP_FROM_NAME=University Voting System
```

> **Note:** Use a **Gmail App Password**, not your regular Gmail password. Generate one at  
> `myaccount.google.com → Security → 2-Step Verification → App Passwords`

---

## Storage: In-Memory vs Database

The OTP store uses a JavaScript `Map` inside the Node.js process — **not a database table**.

**Pros:**

- Fast (no DB round-trip)
- No schema changes needed
- Auto-cleanup every 5 minutes

**Cons:**

- If the backend container **restarts** while a user is mid-verification, their OTP is lost and they must request a new one.

**Production upgrade path:** Replace the in-memory `Map` with a **Redis** cache or a dedicated `otp_tokens` database table for persistence across restarts.

---

## Relevant Source Files

| File                                        | Purpose                                             |
| ------------------------------------------- | --------------------------------------------------- |
| `services/backend/services/otpService.js`   | OTP generation, storage, verification logic         |
| `services/backend/services/emailService.js` | SMTP/Ethereal email sending                         |
| `services/backend/routes/users.js`          | API routes: `/send-otp`, `/verify-otp`, `/register` |
| `services/backend/.env`                     | SMTP credentials configuration                      |
