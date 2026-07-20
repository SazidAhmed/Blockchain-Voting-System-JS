# Ethereal Email Guide (Docker Environment)

## What is Ethereal?

Ethereal is a fake SMTP service for development/testing. Emails sent through Ethereal are never delivered to real recipients — instead, they're stored in Ethereal's web interface where you can view them.

## How It Works in This Project

| Email Domain                                                          | Transport               | Where to View              |
| --------------------------------------------------------------------- | ----------------------- | -------------------------- |
| `@university.edu`, `@faculty.university.edu`, `@staff.university.edu` | Ethereal (test)         | Docker logs + Ethereal web |
| All other domains                                                     | Real SMTP (from `.env`) | Recipient's inbox          |

University.edu emails are intentionally routed to Ethereal — they're fake test accounts for development.

## Accessing Emails in Docker

Since the entire stack runs in Docker, all console output (including Ethereal credentials and OTP codes) goes to **Docker logs**. Here's how to access them.

### Step 1: Find Backend Container Name

```bash
docker-compose -f infra/docker/docker-compose.yml ps
```

Look for the backend service. Container name is usually `voting-backend` or similar.

### Step 2: View Backend Logs (Real-Time)

```bash
docker-compose -f infra/docker/docker-compose.yml logs -f backend
```

This streams all backend logs to your terminal. Look for these patterns:

**Ethereal account creation (happens on first institutional email):**

```text
📧 Creating Ethereal test account for institutional email...
📧 Ethereal ready: random-user@ethereal.email
📧 View emails at: https://ethereal.email/login
```

**OTP sent successfully:**

```text
✅ OTP email sent to student@university.edu (ID: UNI-001) — MessageID: <id>
📧 Ethereal preview: https://ethereal.email/message/abc123...
🔑 [DEV] OTP for UNI-001: 123456
```

### Step 3: Get the Ethereal Credentials

The backend creates an Ethereal test account dynamically via `nodemailer.createTestAccount()` on each server start. Credentials are ephemeral — they don't persist across restarts.

When Ethereal initializes, the logs show the username and password:

```text
📧 Ethereal ready: <username>
📧 Ethereal password: <password>
```

**Option A: Use the preview URL (Easiest)**

When an OTP is sent, the backend logs:

```text
📧 Ethereal preview: https://ethereal.email/message/abc123...
```

**Click this URL directly** — it opens the specific email with the OTP code. No login needed.

**Option B: Log into Ethereal web interface**

1. In the Docker logs, find the lines:
   - `📧 Ethereal ready: <username>`
   - `📧 Ethereal password: <password>`  
     (both should be printed by the backend)

2. To quickly extract them:

```bash
   docker-compose -f infra/docker/docker-compose.yml logs backend | grep -i "Ethereal ready\|Ethereal password"
```

1. Go to <https://ethereal.email/login>
2. Enter the username and password from the logs
3. Browse inbox to see all emails sent through Ethereal

**Option C: Check OTP directly from logs (No Ethereal needed)**

In development mode, the OTP is printed directly:

```text
🔑 [DEV] OTP for UNI-001: 123456
```

This appears in the same Docker logs. Use this to verify without touching Ethereal at all.

### Quick Reference: Docker Log Commands

```bash
# Stream all backend logs (real-time)
docker-compose -f infra/docker/docker-compose.yml logs -f backend

# Search for Ethereal-related logs
docker-compose -f infra/docker/docker-compose.yml logs backend | grep -i "ethereal"

# Search for OTP codes
docker-compose -f infra/docker/docker-compose.yml logs backend | grep -i "OTP"

# Search for preview URLs
docker-compose -f infra/docker/docker-compose.yml logs backend | grep -i "preview"

# Get last 100 lines of backend logs
docker-compose -f infra/docker/docker-compose.yml logs --tail=100 backend
```

## Complete Workflow: Sending and Viewing an OTP

1. Start the stack: `docker-compose -f infra/docker/docker-compose.yml up --build -d`
2. Open a second terminal for logs: `docker-compose -f infra/docker/docker-compose.yml logs -f backend`
3. Register a user with a `@university.edu` email via the frontend
4. In the logs terminal, watch for:
   - `📧 Creating Ethereal test account...` (first time only)
   - `✅ OTP email sent to student@university.edu`
   - `📧 Ethereal preview: https://ethereal.email/message/...`
   - `🔑 [DEV] OTP for UNI-001: 123456`
5. Either click the preview URL, or copy the OTP from the `🔑` line
6. Enter the OTP in the registration form

## Important Notes

- **Ethereal accounts are ephemeral**: Each server restart creates a new account. Old emails are gone.
- **Preview URLs are the fastest way**: Click the `📧 Ethereal preview` URL — no login needed.
- **OTP fallback**: If Ethereal fails, OTP is printed to console. Always check logs.
- **Only university.edu domains**: Other email addresses use real SMTP (not Ethereal).

## Troubleshooting

| Problem                  | Solution                                                  |
| ------------------------ | --------------------------------------------------------- |
| No Ethereal logs appear  | Email wasn't sent to a `@university.edu` address          |
| Preview URL doesn't work | Server restarted — old account gone. Send a new OTP.      |
| Can't log into Ethereal  | Credentials changed on restart. Check logs for new ones.  |
| OTP not in logs          | Check if `NODE_ENV=production` — OTP logging is dev-only  |
| "No email transporter"   | Ethereal init failed. OTP printed to console as fallback. |

## Relevant Files

- `services/backend/services/emailService.js` — Email transport (Ethereal + SMTP)
- `services/backend/services/otpService.js` — OTP generation and verification
- `services/backend/routes/users.js` — Send/verify OTP routes
