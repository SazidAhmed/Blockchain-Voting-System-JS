/**
 * Standalone SMTP connectivity test
 * Usage: node tests/test-smtp.js [recipient@email.com]
 *
 * Loads .env from project root, tests SMTP connection, sends a test email.
 */

const path = require('path');
const nodemailer = require('nodemailer');

// Load .env from project root (not CWD)
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// Mailtrap usernames aren't email addresses — require explicit recipient
const recipient = process.argv[2];
if (!recipient || !recipient.includes('@')) {
  console.error('Usage: node tests/test-smtp.js <recipient@email.com>');
  console.error('  Pass a real email address to receive the test message.');
  process.exit(1);
}

async function test() {
  console.log('=== SMTP Connection Test ===\n');

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user || 'noreply@university.edu';
  const fromName = process.env.SMTP_FROM_NAME || 'University Voting System';

  console.log(`Host:     ${host || '(not set)'}`);
  console.log(`Port:     ${port}`);
  console.log(`Secure:   ${secure}`);
  console.log(`User:     ${user || '(not set)'}`);
  console.log(`Pass:     ${pass ? '****' + pass.slice(-4) : '(not set)'}`);
  console.log(`From:     "${fromName}" <${fromEmail}>`);
  console.log(`To:       ${recipient}`);
  console.log('');

  if (!host || !user || !pass) {
    console.error('ERROR: SMTP_HOST, SMTP_USER, and SMTP_PASS must be set in .env');
    console.error('Expected .env at:', path.resolve(__dirname, '../../../.env'));
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });

  // Step 1: Verify connection
  console.log('Step 1: Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('  -> SMTP connection OK\n');
  } catch (err) {
    console.error('  -> SMTP connection FAILED:', err.message);
    console.error('\nCommon causes:');
    console.error('  - Wrong host/port');
    console.error('  - Firewall blocking outbound SMTP');
    console.error('  - Invalid credentials (app password required for Gmail)');
    console.error('  - TLS/SSL mismatch (secure=true for port 465, false for 587)');
    process.exit(1);
  }

  // Step 2: Send test email
  console.log('Step 2: Sending test email...');
  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: recipient,
    subject: 'SMTP Test — University Voting System',
    text: `Hello!\n\nThis is a test email from the University Voting System.\n\nIf you received this, SMTP is configured correctly.\n\nTimestamp: ${new Date().toISOString()}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:40px auto;padding:30px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color:#2c3e50;">SMTP Test Successful</h2>
        <p style="color:#555;">This is a test email from the <strong>University Voting System</strong>.</p>
        <p style="color:#555;">If you received this, your SMTP configuration is working correctly.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <p style="color:#aaa;font-size:12px;">Sent at ${new Date().toISOString()}</p>
      </div>
    `,
  });

  console.log('  -> Email sent!');
  console.log(`  -> MessageID: ${info.messageId}`);

  if (nodemailer.getTestMessageUrl(info)) {
    console.log(`  -> Preview: ${nodemailer.getTestMessageUrl(info)}`);
  }

  console.log('\n=== All checks passed ===');
}

test().catch(err => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
