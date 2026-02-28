/**
 * Email Service
 * Handles sending OTP verification emails using nodemailer
 * 
 * Supports:
 * - SMTP (Gmail, Outlook, custom SMTP)
 * - Ethereal (for development/testing — emails viewable at https://ethereal.email)
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.testMode = false;
  }

  /**
   * Initialize the email transporter
   * Auto-detects configuration from environment variables
   */
  async initialize() {
    if (this.initialized) return;

    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Production SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        console.log(`📧 Email service initialized with SMTP: ${process.env.SMTP_HOST}`);
      } else {
        // Development mode: use Ethereal test account
        console.log('📧 No SMTP config found. Creating Ethereal test account for development...');
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        this.testMode = true;
        console.log(`📧 Ethereal test account created: ${testAccount.user}`);
        console.log(`📧 View sent emails at: https://ethereal.email/login`);
        console.log(`📧 Login: ${testAccount.user} / ${testAccount.pass}`);
      }

      // Verify connection
      await this.transporter.verify();
      this.initialized = true;
      console.log('✅ Email service ready');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      // Don't throw — we'll handle it gracefully when trying to send
      this.initialized = false;
    }
  }

  /**
   * Send an OTP verification email
   * @param {string} to - Recipient email address
   * @param {string} otp - The OTP code
   * @param {string} fullName - Recipient's full name
   * @param {string} institutionId - The institution ID being verified
   * @returns {Promise<{success: boolean, messageId?: string, previewUrl?: string}>}
   */
  async sendOTPEmail(to, otp, fullName, institutionId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.transporter) {
      console.error('Email transporter not available');
      // In development, log OTP to console as fallback
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📧 EMAIL FALLBACK (transporter not available)`);
      console.log(`To: ${to}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`${'='.repeat(50)}\n`);
      return { success: true, fallback: true };
    }

    const fromName = process.env.SMTP_FROM_NAME || 'University Voting System';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@university.edu';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: `🔐 Your Voting Registration Verification Code`,
      text: this.getPlainTextEmail(otp, fullName, institutionId),
      html: this.getHTMLEmail(otp, fullName, institutionId)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      let previewUrl = null;
      if (this.testMode) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`📧 Preview URL: ${previewUrl}`);
      }

      console.log(`✅ OTP email sent to ${to} (ID: ${institutionId}) — MessageID: ${info.messageId}`);

      // In development, also log the OTP for convenience
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔑 [DEV] OTP for ${institutionId}: ${otp}`);
      }

      return { success: true, messageId: info.messageId, previewUrl };
    } catch (error) {
      console.error(`❌ Failed to send OTP email to ${to}:`, error.message);
      
      // Fallback: log to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`📧 EMAIL FALLBACK (send failed)`);
        console.log(`To: ${to}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`${'='.repeat(50)}\n`);
        return { success: true, fallback: true };
      }

      throw new Error('Failed to send verification email. Please try again.');
    }
  }

  /**
   * Generate plain text email content
   */
  getPlainTextEmail(otp, fullName, institutionId) {
    return `
Hello ${fullName},

Your verification code for Voting System registration is:

${otp}

This code is valid for 10 minutes. Do not share this code with anyone.

Institution ID: ${institutionId}

If you did not request this code, please ignore this email.

— University Voting System
    `.trim();
  }

  /**
   * Generate HTML email content
   */
  getHTMLEmail(otp, fullName, institutionId) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#3498db,#2c3e50);padding:30px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">🗳️ University Voting System</h1>
              <p style="color:#d4e6f1;margin:8px 0 0;font-size:14px;">Email Verification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:30px 40px;">
              <p style="color:#2c3e50;font-size:16px;margin:0 0 20px;">Hello <strong>${fullName}</strong>,</p>
              <p style="color:#555;font-size:14px;margin:0 0 25px;">
                Enter the following code to verify your identity and complete your voter registration:
              </p>
              <!-- OTP Code -->
              <div style="background:#f0f7ff;border:2px dashed #3498db;border-radius:8px;padding:20px;text-align:center;margin:0 0 25px;">
                <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2c3e50;">${otp}</span>
              </div>
              <p style="color:#888;font-size:13px;margin:0 0 8px;">⏱ This code expires in <strong>10 minutes</strong></p>
              <p style="color:#888;font-size:13px;margin:0 0 20px;">🆔 Institution ID: <strong>${institutionId}</strong></p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
              <p style="color:#e74c3c;font-size:13px;margin:0;">
                ⚠️ If you did not request this code, please ignore this email. Never share your verification code with anyone.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:20px 40px;text-align:center;">
              <p style="color:#aaa;font-size:12px;margin:0;">University Voting System — Secure & Transparent Elections</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}

// Export singleton instance
module.exports = new EmailService();
