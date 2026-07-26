const crypto = require("crypto");
const { pool } = require("../config/db");

pool
  .query(
    `CREATE TABLE IF NOT EXISTS otp_codes (
  institution_id VARCHAR(20) PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  email VARCHAR(255) NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  attempts INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  verified_at BIGINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  )
  .catch((err) => {
    console.error("Failed to create otp_codes table:", err.message);
  });

class OTPService {
  constructor() {
    this.OTP_LENGTH = 6;
    this.OTP_EXPIRY_MINUTES = 10;
    this.MAX_ATTEMPTS = 3;
    this.COOLDOWN_SECONDS = 60;
  }

  generateOTP() {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    const otp = min + (randomNumber % (max - min + 1));
    return otp.toString();
  }

  async createOTP(institutionId, email) {
    const normalizedId = institutionId.toUpperCase();
    const now = Date.now();

    const [existing] = await pool.query(
      "SELECT created_at FROM otp_codes WHERE institution_id = ?",
      [normalizedId],
    );
    if (existing.length > 0) {
      const secondsSinceCreation = (now - existing[0].created_at) / 1000;
      if (secondsSinceCreation < this.COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(
          this.COOLDOWN_SECONDS - secondsSinceCreation,
        );
        throw new Error(
          `Please wait ${waitSeconds} seconds before requesting a new code.`,
        );
      }
    }

    const code = this.generateOTP();

    await pool.query(
      `INSERT INTO otp_codes (institution_id, code, email, expires_at, created_at, attempts, verified)
       VALUES (?, ?, ?, ?, ?, 0, FALSE)
       ON DUPLICATE KEY UPDATE code = VALUES(code), email = VALUES(email),
         expires_at = VALUES(expires_at), created_at = VALUES(created_at),
         attempts = 0, verified = FALSE, verified_at = NULL`,
      [
        normalizedId,
        code,
        email,
        now + this.OTP_EXPIRY_MINUTES * 60 * 1000,
        now,
      ],
    );

    return {
      code,
      email,
      maskedEmail: this.maskEmail(email),
      expiresInMinutes: this.OTP_EXPIRY_MINUTES,
    };
  }

  async verifyOTP(institutionId, code) {
    const normalizedId = institutionId.toUpperCase();
    const [rows] = await pool.query(
      "SELECT * FROM otp_codes WHERE institution_id = ?",
      [normalizedId],
    );

    if (rows.length === 0) {
      return {
        valid: false,
        message: "No verification code found. Please request a new one.",
      };
    }

    const storedOTP = rows[0];

    if (Date.now() > storedOTP.expires_at) {
      await pool.query("DELETE FROM otp_codes WHERE institution_id = ?", [
        normalizedId,
      ]);
      return {
        valid: false,
        message: "Verification code has expired. Please request a new one.",
      };
    }

    if (storedOTP.attempts >= this.MAX_ATTEMPTS) {
      await pool.query("DELETE FROM otp_codes WHERE institution_id = ?", [
        normalizedId,
      ]);
      return {
        valid: false,
        message: "Too many failed attempts. Please request a new code.",
      };
    }

    await pool.query(
      "UPDATE otp_codes SET attempts = attempts + 1 WHERE institution_id = ?",
      [normalizedId],
    );

    const codeBuffer = Buffer.from(
      code.toString().padStart(this.OTP_LENGTH, "0"),
    );
    const storedBuffer = Buffer.from(storedOTP.code);

    if (
      codeBuffer.length !== storedBuffer.length ||
      !crypto.timingSafeEqual(codeBuffer, storedBuffer)
    ) {
      const remaining = this.MAX_ATTEMPTS - storedOTP.attempts - 1;
      return {
        valid: false,
        message:
          remaining > 0
            ? `Invalid code. ${remaining} attempt(s) remaining.`
            : "Too many failed attempts. Please request a new code.",
      };
    }

    await pool.query(
      "UPDATE otp_codes SET verified = TRUE, verified_at = ? WHERE institution_id = ?",
      [Date.now(), normalizedId],
    );

    return { valid: true, message: "Email verified successfully." };
  }

  async isVerified(institutionId) {
    const normalizedId = institutionId.toUpperCase();
    const [rows] = await pool.query(
      "SELECT verified, verified_at FROM otp_codes WHERE institution_id = ?",
      [normalizedId],
    );

    if (rows.length === 0) return false;
    if (!rows[0].verified) return false;

    const VERIFIED_EXPIRY = 15 * 60 * 1000;
    if (Date.now() - rows[0].verified_at > VERIFIED_EXPIRY) {
      await pool.query("DELETE FROM otp_codes WHERE institution_id = ?", [
        normalizedId,
      ]);
      return false;
    }

    return true;
  }

  async consumeVerification(institutionId) {
    const normalizedId = institutionId.toUpperCase();
    await pool.query("DELETE FROM otp_codes WHERE institution_id = ?", [
      normalizedId,
    ]);
  }

  maskEmail(email) {
    const [local, domain] = email.split("@");
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local.slice(-1)}@${domain}`;
  }

  cleanup() {
    // ponytail: DB cleanup via expiration checks in queries
  }

  shutdown() {
    // ponytail: no cleanup interval needed
  }
}

module.exports = new OTPService();
