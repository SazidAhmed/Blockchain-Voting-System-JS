/**
 * OTP Service
 * Generates, stores, and verifies one-time passwords for email verification
 * Uses in-memory store with automatic expiration (no DB dependency)
 */

const crypto = require('crypto');

class OTPService {
  constructor() {
    // In-memory OTP store: key = institutionId, value = { code, email, expiresAt, attempts }
    this.otpStore = new Map();
    this.OTP_LENGTH = 6;
    this.OTP_EXPIRY_MINUTES = 10;
    this.MAX_ATTEMPTS = 3;
    this.COOLDOWN_SECONDS = 60; // Minimum seconds between OTP sends

    // Clean up expired OTPs every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate a cryptographically secure numeric OTP
   */
  generateOTP() {
    // Generate a random number with the specified length
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    const otp = min + (randomNumber % (max - min + 1));
    return otp.toString();
  }

  /**
   * Create and store an OTP for a given institution ID
   * @returns {{ code: string, email: string, maskedEmail: string }} or throws error
   */
  createOTP(institutionId, email) {
    const normalizedId = institutionId.toUpperCase();

    // Check cooldown (prevent spam)
    const existing = this.otpStore.get(normalizedId);
    if (existing && existing.createdAt) {
      const secondsSinceCreation = (Date.now() - existing.createdAt) / 1000;
      if (secondsSinceCreation < this.COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(this.COOLDOWN_SECONDS - secondsSinceCreation);
        throw new Error(`Please wait ${waitSeconds} seconds before requesting a new code.`);
      }
    }

    const code = this.generateOTP();
    const now = Date.now();

    this.otpStore.set(normalizedId, {
      code,
      email,
      expiresAt: now + (this.OTP_EXPIRY_MINUTES * 60 * 1000),
      createdAt: now,
      attempts: 0,
      verified: false
    });

    return {
      code,
      email,
      maskedEmail: this.maskEmail(email),
      expiresInMinutes: this.OTP_EXPIRY_MINUTES
    };
  }

  /**
   * Verify an OTP for a given institution ID
   * @returns {{ valid: boolean, message: string }}
   */
  verifyOTP(institutionId, code) {
    const normalizedId = institutionId.toUpperCase();
    const storedOTP = this.otpStore.get(normalizedId);

    if (!storedOTP) {
      return { valid: false, message: 'No verification code found. Please request a new one.' };
    }

    // Check expiration
    if (Date.now() > storedOTP.expiresAt) {
      this.otpStore.delete(normalizedId);
      return { valid: false, message: 'Verification code has expired. Please request a new one.' };
    }

    // Check max attempts
    if (storedOTP.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(normalizedId);
      return { valid: false, message: 'Too many failed attempts. Please request a new code.' };
    }

    // Increment attempt counter
    storedOTP.attempts += 1;

    // Constant-time comparison to prevent timing attacks
    const codeBuffer = Buffer.from(code.toString().padStart(this.OTP_LENGTH, '0'));
    const storedBuffer = Buffer.from(storedOTP.code);

    if (codeBuffer.length !== storedBuffer.length || !crypto.timingSafeEqual(codeBuffer, storedBuffer)) {
      const remaining = this.MAX_ATTEMPTS - storedOTP.attempts;
      return {
        valid: false,
        message: remaining > 0
          ? `Invalid code. ${remaining} attempt(s) remaining.`
          : 'Too many failed attempts. Please request a new code.'
      };
    }

    // Mark as verified (don't delete — registration will check this)
    storedOTP.verified = true;
    storedOTP.verifiedAt = Date.now();

    return { valid: true, message: 'Email verified successfully.' };
  }

  /**
   * Check if an institution ID has a verified OTP
   * Used during registration to ensure email was verified
   */
  isVerified(institutionId) {
    const normalizedId = institutionId.toUpperCase();
    const storedOTP = this.otpStore.get(normalizedId);

    if (!storedOTP) return false;
    if (!storedOTP.verified) return false;

    // Verified OTPs are valid for 15 minutes after verification
    const VERIFIED_EXPIRY = 15 * 60 * 1000;
    if (Date.now() - storedOTP.verifiedAt > VERIFIED_EXPIRY) {
      this.otpStore.delete(normalizedId);
      return false;
    }

    return true;
  }

  /**
   * Consume a verified OTP (call after successful registration)
   */
  consumeVerification(institutionId) {
    const normalizedId = institutionId.toUpperCase();
    this.otpStore.delete(normalizedId);
  }

  /**
   * Mask an email address for display (e.g., j***n@university.edu)
   */
  maskEmail(email) {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local.slice(-1)}@${domain}`;
  }

  /**
   * Clean up expired OTPs from the store
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.otpStore.entries()) {
      // Remove expired unverified OTPs
      if (now > value.expiresAt && !value.verified) {
        this.otpStore.delete(key);
      }
      // Remove verified OTPs older than 15 minutes
      if (value.verified && value.verifiedAt && (now - value.verifiedAt > 15 * 60 * 1000)) {
        this.otpStore.delete(key);
      }
    }
  }

  /**
   * Shutdown cleanup interval (for graceful shutdown)
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Export singleton instance
module.exports = new OTPService();
