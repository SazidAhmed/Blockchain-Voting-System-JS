const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { pool } = require("../../config/db");
const { adminAuth } = require("../../middleware/auth");
const {
  validateElectionId,
  validateCreateElection,
} = require("../../middleware/validation");
const { withAdminAudit } = require("../../middleware/auditMiddleware");
const { encryptTally } = require("../../utils/tallyEncryption");
const AdminAuditLogger = require("../../utils/adminAuditLogger");

const adminLogger = new AdminAuditLogger(pool);

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    "unknown"
  );
}

// @route   POST /api/elections
// @desc    Create a new election
// @access  Admin only
router.post(
  "/",
  adminAuth,
  validateCreateElection,
  withAdminAudit("CREATE_ELECTION", "elections"),
  async (req, res) => {
    try {
      const { title, description, startDate, endDate, candidates } = req.body;
      const adminId = req.user.id;
      const clientIp = getClientIp(req);

      // Validate input
      if (
        !title ||
        !startDate ||
        !endDate ||
        !candidates ||
        candidates.length === 0
      ) {
        await adminLogger.logFailedAction(
          adminId,
          "CREATE_ELECTION",
          "elections",
          null,
          "Invalid input: missing required fields",
          { ipAddress: clientIp },
        );
        return res
          .status(400)
          .json({ message: "Please provide all required fields" });
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        await adminLogger.logFailedAction(
          adminId,
          "CREATE_ELECTION",
          "elections",
          null,
          "Invalid dates: start date must be before end date",
          { ipAddress: clientIp },
        );
        return res
          .status(400)
          .json({ message: "Start date must be before end date" });
      }

      // Generate RSA keypair for election ballot encryption
      const { generateKeyPairSync } = require("crypto");
      const { publicKey: electionPublicKey, privateKey: tallyKey } =
        generateKeyPairSync("rsa", {
          modulusLength: 2048,
          publicKeyEncoding: { type: "spki", format: "pem" },
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });

      // Insert election into database
      const [result] = await pool.query(
        "INSERT INTO elections (title, description, start_date, end_date, status, created_by, public_key, tally_key, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          title,
          description,
          startDate,
          endDate,
          "pending",
          adminId,
          electionPublicKey,
          tallyKey,
          false,
        ],
      );

      const electionId = result.insertId;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Batch insert candidates
        if (candidates && candidates.length > 0) {
          const candidateValues = candidates.map((c) => [
            electionId,
            c.name,
            c.description || null,
            false,
          ]);
          await connection.query(
            "INSERT INTO candidates (election_id, name, description, is_locked) VALUES ?",
            [candidateValues],
          );
        }

        // Auto-register all existing verified users for this new election
        try {
          const [existingUsers] = await connection.query(
            "SELECT id FROM users WHERE registration_status = 'verified' OR registration_status IS NULL",
          );
          if (existingUsers.length > 0) {
            const regValues = existingUsers.map((u) => [
              u.id,
              electionId,
              crypto.randomBytes(32).toString("hex"),
              "registered",
            ]);
            await connection.query(
              "INSERT IGNORE INTO voter_registrations (user_id, election_id, registration_token, status) VALUES ?",
              [regValues],
            );
            console.log(
              `✅ Auto-registered ${existingUsers.length} existing user(s) for election #${electionId}`,
            );
          }
        } catch (regErr) {
          console.warn(
            "Warning: Could not auto-register existing users for new election:",
            regErr.message,
          );
        }

        await connection.commit();
      } catch (txErr) {
        await connection.rollback();
        throw txErr;
      } finally {
        connection.release();
      }

      // Log security event
      await adminLogger.logSecurityEvent(
        adminId,
        "ELECTION_CREATED",
        "LOW",
        `Election #${electionId} created with ${candidates.length} candidates`,
        { electionId, title },
      );

      res.status(201).json({
        message: "Election created successfully",
        electionId,
        title,
        startDate,
        endDate,
        publicKey: electionPublicKey,
      });
    } catch (err) {
      console.error(err);
      await adminLogger.logFailedAction(
        req.user.id,
        "CREATE_ELECTION",
        "elections",
        null,
        `Server error: ${err.message}`,
        { ipAddress: getClientIp(req) },
      );
      res.status(500).json({ message: "Server error" });
    }
  },
);

// @route   GET /api/elections
// @desc    Get all elections
// @access  Public
router.get("/", async (req, res) => {
  try {
    const [elections] = await pool.query(
      "SELECT id, title, description, start_date, end_date, status, created_at FROM elections ORDER BY created_at DESC",
    );

    res.json(elections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/elections/:id
// @desc    Get election by ID with candidates
// @access  Public
router.get("/:id", validateElectionId, async (req, res) => {
  try {
    const [elections] = await pool.query(
      "SELECT id, title, description, start_date, end_date, status, public_key, created_at FROM elections WHERE id = ?",
      [req.params.id],
    );

    if (elections.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = elections[0];

    // Get candidates
    const [candidates] = await pool.query(
      "SELECT id, name, description FROM candidates WHERE election_id = ?",
      [req.params.id],
    );

    // Check if results are released
    const [[electionMeta]] = await pool.query(
      "SELECT results_released, tally_key FROM elections WHERE id = ?",
      [req.params.id],
    );

    // Tally votes per candidate from votes_meta (RSA-encrypted ballots)
    const [votes] = await pool.query(
      "SELECT encrypted_ballot FROM votes_meta WHERE election_id = ?",
      [req.params.id],
    );
    const tally = {};
    for (const v of votes) {
      try {
        let ballot;
        if (electionMeta && electionMeta.tally_key) {
          try {
            const decrypted = crypto.privateDecrypt(
              { key: electionMeta.tally_key, oaepHash: "sha256" },
              Buffer.from(v.encrypted_ballot, "base64"),
            );
            ballot = JSON.parse(decrypted.toString("utf8"));
          } catch (_) {
            ballot = JSON.parse(
              Buffer.from(v.encrypted_ballot, "base64").toString("utf8"),
            );
          }
        } else {
          ballot = JSON.parse(
            Buffer.from(v.encrypted_ballot, "base64").toString("utf8"),
          );
        }
        const cid = ballot.candidateId;
        if (cid) tally[cid] = (tally[cid] || 0) + 1;
      } catch (_) {
        /* skip unreadable ballots */
      }
    }

    const totalVotes = Object.values(tally).reduce(
      (sum, count) => sum + count,
      0,
    );

    if (electionMeta && electionMeta.results_released) {
      // Results released — return plaintext tally
      const candidatesWithVotes = candidates.map((c) => ({
        ...c,
        votes_count: tally[c.id] || 0,
      }));

      res.json({
        ...election,
        candidates: candidatesWithVotes,
        totalVotes,
        resultsReleased: true,
      });
    } else {
      // Results not released — return encrypted tally
      let encryptedTally = null;
      if (
        electionMeta &&
        electionMeta.tally_key &&
        electionMeta.tally_key.length <= 64 &&
        /^[0-9a-f]+$/i.test(electionMeta.tally_key)
      ) {
        try {
          encryptedTally = encryptTally(tally, electionMeta.tally_key);
        } catch (_) {
          encryptedTally = null;
        }
      }

      res.json({
        ...election,
        candidates: candidates.map((c) => ({ ...c, votes_count: null })),
        totalVotes,
        encryptedTally,
        resultsReleased: false,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/elections/:id/status
// @desc    Update election status
// @access  Admin only
// @route   PUT /api/elections/:id
// @desc    Update election details
// @access  Admin only
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { title, description, startDate, endDate, candidates } = req.body;
    const electionId = req.params.id;

    // Validate required fields
    if (!title || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Title, start date, and end date are required" });
    }

    // Check if election exists and get current details
    const [elections] = await pool.query(
      "SELECT id, start_date, status FROM elections WHERE id = ?",
      [electionId],
    );

    if (elections.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = elections[0];
    const now = new Date();
    const electionStartDate = new Date(election.start_date);

    // Prevent updates if election is active
    if (election.status === "active") {
      return res.status(403).json({
        message: "Cannot update an active election",
        reason: "Deactivate the election before making changes",
      });
    }

    // Prevent updates if election has already started
    if (electionStartDate <= now) {
      return res.status(403).json({
        message: "Cannot update election after it has started",
        reason: "Election has already begun and cannot be modified",
      });
    }

    // Update election
    const [result] = await pool.query(
      "UPDATE elections SET title = ?, description = ?, start_date = ?, end_date = ? WHERE id = ?",
      [title, description, new Date(startDate), new Date(endDate), electionId],
    );

    // Handle candidates if provided
    if (candidates && Array.isArray(candidates)) {
      // Get existing candidates
      const [existingCandidates] = await pool.query(
        "SELECT id, name FROM candidates WHERE election_id = ?",
        [electionId],
      );

      const existingIds = existingCandidates.map((c) => c.id);
      const updatedIds = candidates.filter((c) => c.id).map((c) => c.id);

      // Delete candidates not in the updated list
      const toDelete = existingIds.filter((id) => !updatedIds.includes(id));
      if (toDelete.length > 0) {
        await pool.query("DELETE FROM candidates WHERE id IN (?)", [toDelete]);
      }

      // Update or insert candidates
      for (const candidate of candidates) {
        if (candidate.id) {
          // Update existing candidate
          await pool.query(
            "UPDATE candidates SET name = ?, description = ? WHERE id = ?",
            [candidate.name, candidate.description || "", candidate.id],
          );
        } else if (candidate.name) {
          // Insert new candidate
          await pool.query(
            "INSERT INTO candidates (election_id, name, description) VALUES (?, ?, ?)",
            [electionId, candidate.name, candidate.description || ""],
          );
        }
      }
    }

    res.json({ message: "Election updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PATCH /api/elections/:id/status
// @desc    Update election status
// @access  Admin only
router.patch("/:id/status", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const electionId = req.params.id;

    const VALID_TRANSITIONS = {
      pending: ["active"],
      active: ["completed"],
      completed: [],
    };

    if (!VALID_TRANSITIONS[status]) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const [[current]] = await pool.query(
      "SELECT status FROM elections WHERE id = ?",
      [electionId],
    );
    if (!current)
      return res.status(404).json({ message: "Election not found" });

    if (!VALID_TRANSITIONS[current.status].includes(status)) {
      return res.status(403).json({
        message: `Cannot transition from '${current.status}' to '${status}'. Allowed: ${VALID_TRANSITIONS[current.status].join(", ") || "none"}`,
      });
    }

    await pool.query("UPDATE elections SET status = ? WHERE id = ?", [
      status,
      electionId,
    ]);

    res.json({ message: "Election status updated successfully", status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PATCH /api/elections/:id/lock
// @desc    Lock election (prevent mutations after start)
// @access  Admin only
router.patch("/:id/lock", adminAuth, async (req, res) => {
  try {
    const electionId = req.params.id;
    const adminId = req.user.id;
    const clientIp = getClientIp(req);

    // Check election exists
    const [elections] = await pool.query(
      "SELECT id, status FROM elections WHERE id = ?",
      [electionId],
    );
    if (elections.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = elections[0];

    // Lock the election
    const now = new Date();
    await pool.query(
      "UPDATE elections SET is_locked = TRUE, locked_at = ?, locked_by = ? WHERE id = ?",
      [now, adminId, electionId],
    );

    // Lock all candidates
    await pool.query(
      "UPDATE candidates SET is_locked = TRUE, locked_at = ? WHERE election_id = ?",
      [now, electionId],
    );

    // Log the action
    await adminLogger.logAdminAction(
      adminId,
      "LOCK_ELECTION",
      "elections",
      electionId,
      { previousStatus: election.status, lockedAt: now },
      { ipAddress: clientIp },
    );

    await adminLogger.logSecurityEvent(
      adminId,
      "ELECTION_LOCKED",
      "MEDIUM",
      `Election #${electionId} locked - no more mutations allowed`,
      { electionId },
    );

    res.json({ message: "Election locked successfully" });
  } catch (err) {
    console.error(err);
    await adminLogger.logFailedAction(
      req.user.id,
      "LOCK_ELECTION",
      "elections",
      req.params.id,
      err.message,
      { ipAddress: getClientIp(req) },
    );
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/elections/:id
// @desc    Delete an election
// @access  Admin only
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const electionId = req.params.id;

    // Check if election exists and get current details
    const [elections] = await pool.query(
      "SELECT id, start_date, status, title FROM elections WHERE id = ?",
      [electionId],
    );

    if (elections.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    const election = elections[0];
    const now = new Date();
    const electionStartDate = new Date(election.start_date);

    // Prevent deletion only if election is ACTIVE and has already started
    // Deactivated elections can be deleted even after start date
    if (election.status === "active" && electionStartDate <= now) {
      return res.status(403).json({
        message: "Cannot delete active election after it has started",
        reason:
          "Election is active and has already begun. Deactivate it first if you need to delete it.",
        election: election.title,
      });
    }

    // Delete related data first
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM votes_meta WHERE election_id = ?", [
        electionId,
      ]);
      await connection.query(
        "DELETE FROM voter_registrations WHERE election_id = ?",
        [electionId],
      );
      await connection.query("DELETE FROM candidates WHERE election_id = ?", [
        electionId,
      ]);
      await connection.query("DELETE FROM elections WHERE id = ?", [
        electionId,
      ]);
      await connection.commit();
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }

    res.json({ message: "Election deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
