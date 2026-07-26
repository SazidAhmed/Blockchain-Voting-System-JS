const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const axios = require("axios");
const { pool } = require("../config/db");
const { auth } = require("../middleware/auth");
const {
  registerLimiter,
  loginLimiter,
  otpLimiter,
} = require("../middleware/rateLimiter");
const {
  validateRegistration,
  validateLogin,
} = require("../middleware/validation");
const { hashPassword, comparePassword } = require("../utils/password");
const tokenBlacklist = require("../utils/tokenBlacklist");

const AuditLogger = require("../utils/auditLogger");
const auditLogger = new AuditLogger(pool);
const otpService = require("../services/otpService");
const emailService = require("../services/emailService");
require("dotenv").config();

const INSTITUTION_API_URL =
  process.env.INSTITUTION_API_URL || "http://localhost:4000";

// Helper: look up a member in the institutional directory
async function lookupInstitutionMember(institutionId) {
  try {
    const response = await axios.get(
      `${INSTITUTION_API_URL}/api/lookup/${institutionId}`,
      { timeout: 5000 },
    );
    return response.data;
  } catch (err) {
    if (err.response && err.response.status === 404) return null;
    throw new Error(
      "Institutional directory is currently unavailable. Please try again later.",
    );
  }
}

// @route   GET /api/users/institution-lookup/:institutionId
// @desc    Look up a member in the institutional directory (proxy)
// @access  Public
router.get("/institution-lookup/:institutionId", async (req, res) => {
  try {
    const member = await lookupInstitutionMember(
      req.params.institutionId.toUpperCase(),
    );
    if (!member) {
      return res.status(404).json({
        message:
          "Institution ID not found. Please check your ID and try again.",
      });
    }
    res.json(member);
  } catch (err) {
    res.status(503).json({ message: err.message });
  }
});

// @route   POST /api/users/send-otp
// @desc    Send OTP verification code to member's institutional email
// @access  Public
router.post("/send-otp", otpLimiter, async (req, res) => {
  try {
    const { institutionId } = req.body;

    if (!institutionId) {
      return res.status(400).json({ message: "Institution ID is required." });
    }

    // Look up the member in the institutional directory
    let member;
    try {
      member = await lookupInstitutionMember(institutionId.toUpperCase());
    } catch (err) {
      return res.status(503).json({ message: err.message });
    }

    if (!member) {
      return res.status(404).json({ message: "Institution ID not found." });
    }

    // Check if already registered as a voter
    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE institution_id = ?",
      [institutionId.toUpperCase()],
    );
    if (existingUsers.length > 0) {
      return res.status(400).json({
        message: "This ID is already registered. Please login instead.",
      });
    }

    // Generate OTP
    let otpData;
    try {
      otpData = await otpService.createOTP(institutionId, member.email);
    } catch (err) {
      return res.status(429).json({ message: err.message });
    }

    // Send OTP via email
    await emailService.sendOTPEmail(
      member.email,
      otpData.code,
      member.fullName,
      institutionId.toUpperCase(),
    );

    console.log(
      `📧 OTP sent to ${otpData.maskedEmail} for ${institutionId.toUpperCase()}`,
    );

    res.json({
      message: "Verification code sent to your institutional email.",
      maskedEmail: otpData.maskedEmail,
      expiresInMinutes: otpData.expiresInMinutes,
    });
  } catch (err) {
    console.error("OTP send error:", err);
    res
      .status(500)
      .json({ message: "Failed to send verification code. Please try again." });
  }
});

// @route   POST /api/users/verify-otp
// @desc    Verify OTP code entered by user
// @access  Public
router.post("/verify-otp", otpLimiter, async (req, res) => {
  try {
    const { institutionId, code } = req.body;

    if (!institutionId || !code) {
      return res.status(400).json({
        message: "Institution ID and verification code are required.",
      });
    }

    const result = await otpService.verifyOTP(institutionId, code);

    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }

    res.json({ message: result.message, verified: true });
  } catch (err) {
    console.error("OTP verify error:", err);
    res.status(500).json({ message: "Verification failed. Please try again." });
  }
});

// @route   POST /api/users/register
// @desc    Register a new user (requires verified OTP)
// @access  Public
router.post(
  "/register",
  registerLimiter,
  validateRegistration,
  async (req, res) => {
    try {
      const { institutionId, password, publicKey, encryptionPublicKey } =
        req.body;

      // ✅ Verify that email OTP was completed for this institution ID
      if (!(await otpService.isVerified(institutionId))) {
        return res.status(403).json({
          message:
            "Email verification required. Please verify your email before registering.",
          requiresOTP: true,
        });
      }

      // Verify institution ID against the institutional directory
      let member;
      try {
        member = await lookupInstitutionMember(institutionId.toUpperCase());
      } catch (err) {
        return res.status(503).json({ message: err.message });
      }

      if (!member) {
        return res.status(400).json({
          message:
            "Institution ID not found in the university directory. Please verify your ID.",
        });
      }

      // Use details from institutional directory (not user-supplied)
      const username = member.fullName;
      const email = member.email;
      const role = member.role;

      // Check if user already exists
      const [existingUsers] = await pool.query(
        "SELECT id FROM users WHERE institution_id = ? OR email = ?",
        [institutionId, email],
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Require client-side key generation
      if (!publicKey || !encryptionPublicKey) {
        return res.status(400).json({
          message:
            "Client-side key generation required. Please generate keys in your browser.",
        });
      }

      const userPublicKey = publicKey;
      const userEncryptionPublicKey = encryptionPublicKey;

      // Generate pseudonym ID (deterministic hash of institution ID for privacy)
      const pseudonymId = crypto
        .createHash("sha256")
        .update(institutionId)
        .digest("hex");

      // Insert user into database
      const [result] = await pool.query(
        "INSERT INTO users (institution_id, username, password, role, email, public_key, pseudonym_id, encryption_public_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          institutionId,
          username,
          hashedPassword,
          role,
          email,
          userPublicKey,
          pseudonymId,
          userEncryptionPublicKey,
        ],
      );

      const userId = result.insertId;

      // Auto-register user for all active and pending elections
      let electionsRegisteredCount = 0;
      let regError;
      try {
        const [activeElections] = await pool.query(
          "SELECT id FROM elections WHERE status IN ('active', 'pending')",
        );

        if (activeElections.length > 0) {
          const registrationPromises = activeElections.map((election) => {
            const registrationToken = crypto.randomBytes(32).toString("hex");
            return pool.query(
              "INSERT INTO voter_registrations (user_id, election_id, registration_token, status) VALUES (?, ?, ?, ?)",
              [userId, election.id, registrationToken, "registered"],
            );
          });

          await Promise.all(registrationPromises);
          electionsRegisteredCount = activeElections.length;
          console.log(
            `✅ Auto-registered user ${institutionId} for ${electionsRegisteredCount} election(s)`,
          );
        }
      } catch (e) {
        regError = e;
        console.error(
          "Warning: Failed to auto-register user for elections:",
          e,
        );
      }

      const response = {
        user: {
          id: userId,
          institutionId,
          username,
          role,
          email,
          publicKey: userPublicKey,
          encryptionPublicKey: userEncryptionPublicKey,
        },
        electionsRegistered: electionsRegisteredCount,
        ...(regError ? { registrationWarning: regError.message } : {}),
      };

      // Log successful registration
      await auditLogger.logUserRegistration(
        userId,
        institutionId,
        true,
        {
          username,
          role,
          email,
          keysGeneratedBy: "client",
          electionsAutoRegistered: electionsRegisteredCount,
        },
        req,
      );

      // Mark this institution member as a registered voter in the directory
      try {
        const institutionApiKey = process.env.INSTITUTION_API_KEY;
        const patchHeaders = { timeout: 3000 };
        if (institutionApiKey) {
          patchHeaders.headers = { "x-api-key": institutionApiKey };
        }
        await axios.patch(
          `${INSTITUTION_API_URL}/api/members/${institutionId.toUpperCase()}/voter`,
          { is_voter: true },
          patchHeaders,
        );
      } catch (markErr) {
        // Non-fatal — registration still succeeds
        console.warn(
          "Warning: Could not mark institution member as voter:",
          markErr.message,
        );
      }

      // Consume the OTP verification (one-time use)
      await otpService.consumeVerification(institutionId);

      res.status(201).json(response);
    } catch (err) {
      console.error(err);

      // Log failed registration
      await auditLogger.logUserRegistration(
        null,
        req.body.institutionId,
        false,
        {
          error: err.message,
          errorType: err.code || "UNKNOWN",
        },
        req,
      );

      res.status(500).json({ message: "Server error" });
    }
  },
);

// @route   POST /api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", loginLimiter, validateLogin, async (req, res) => {
  try {
    const { institutionId, password } = req.body;

    // Input is already validated by middleware

    // Check if user exists
    const [users] = await pool.query(
      "SELECT id, institution_id, username, role, email, password, public_key, encryption_public_key, registration_status, mfa_enabled, mfa_secret FROM users WHERE institution_id = ?",
      [institutionId],
    );

    if (users.length === 0) {
      // Log failed login attempt
      await auditLogger.logUserLogin(
        null,
        institutionId,
        false,
        { reason: "User not found" },
        req,
      );
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    // Validate password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      // Log failed login attempt
      await auditLogger.logUserLogin(
        user.id,
        institutionId,
        false,
        { reason: "Invalid password" },
        req,
      );
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Role-based login filtering
    const { loginType } = req.body;
    if (
      loginType === "voter" &&
      (user.role === "admin" || user.role === "board_member")
    ) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (
      loginType === "admin" &&
      user.role !== "admin" &&
      user.role !== "board_member"
    ) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        institutionId: user.institution_id,
        jti: crypto.randomUUID(),
      },
      process.env.JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" },
    );

    // Set httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    // Log successful login
    await auditLogger.logUserLogin(
      user.id,
      institutionId,
      true,
      { username: user.username, role: user.role },
      req,
    );

    res.json({
      token,
      user: {
        id: user.id,
        institutionId: user.institution_id,
        username: user.username,
        role: user.role,
        email: user.email,
        publicKey: user.public_key,
        encryptionPublicKey: user.encryption_public_key,
      },
    });
  } catch (err) {
    console.error("Login error:", err);

    // Log failed login
    await auditLogger.logUserLogin(
      null,
      req.body.institutionId,
      false,
      {
        error: err.message,
        errorType: err.code || "UNKNOWN",
      },
      req,
    );

    const isDev = process.env.NODE_ENV !== "production";
    res.status(500).json({
      message: isDev
        ? `Server error: ${err.message}`
        : "Server error. Please try again later.",
      ...(isDev && { code: err.code, type: err.name }),
    });
  }
});

// @route   GET /api/users/me
// @desc    Get current user
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, institution_id, username, role, email, public_key, encryption_public_key, created_at FROM users WHERE id = ?",
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    res.json({
      id: user.id,
      institutionId: user.institution_id,
      username: user.username,
      role: user.role,
      email: user.email,
      publicKey: user.public_key,
      encryptionPublicKey: user.encryption_public_key,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/users/logout
// @desc    Logout user, revoke token
// @access  Private
router.post("/auth/logout", auth, async (req, res) => {
  if (req.user.jti) {
    await tokenBlacklist.add(req.user.jti);
  }
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

module.exports = router;
