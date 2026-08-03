const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { pool } = require("../../config/db");
const { auth, adminAuth } = require("../../middleware/auth");
const AdminAuditLogger = require("../../utils/adminAuditLogger");

const adminLogger = new AdminAuditLogger(pool);

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    "unknown"
  );
}

function computeTally(election, votes) {
  const tally = {};
  let corruptCount = 0;
  for (const v of votes) {
    try {
      let ballot;
      if (election.tally_key) {
        // M-17: never fall back to unencrypted decode — skip corrupt ballots
        const decrypted = crypto.privateDecrypt(
          { key: election.tally_key, oaepHash: "sha256" },
          Buffer.from(v.encrypted_ballot, "base64"),
        );
        ballot = JSON.parse(decrypted.toString("utf8"));
      } else {
        ballot = JSON.parse(
          Buffer.from(v.encrypted_ballot, "base64").toString("utf8"),
        );
      }
      const cid = ballot.candidateId;
      if (cid) tally[cid] = (tally[cid] || 0) + 1;
    } catch (err) {
      corruptCount++;
      console.warn("Ballot tally error (skipped):", err.message);
    }
  }
  if (corruptCount > 0) {
    console.warn(
      `Tally: ${corruptCount} corrupt/undecryptable ballots skipped (M-17)`,
    );
  }
  return tally;
}

// @route   GET /api/elections/admin
// @desc    Get all elections with stats (admin only)
// @access  Admin only
router.get("/admin/all", auth, adminAuth, async (req, res) => {
  try {
    const [elections] = await pool.query(
      "SELECT e.*, COUNT(DISTINCT c.id) as candidates_count, COUNT(DISTINCT vr.id) as registrations_count, COUNT(DISTINCT vm.id) as votes_count FROM elections e LEFT JOIN candidates c ON e.id = c.election_id LEFT JOIN voter_registrations vr ON e.id = vr.election_id LEFT JOIN votes_meta vm ON e.id = vm.election_id GROUP BY e.id ORDER BY e.created_at DESC",
    );

    // Get candidates + tally votes per candidate by decoding encrypted ballots
    const electionIds = elections.map((e) => e.id);
    const [allCandidates] =
      electionIds.length > 0
        ? await pool.query(
            "SELECT id, name, description, election_id, is_locked FROM candidates WHERE election_id IN (?) ORDER BY election_id, name",
            [electionIds],
          )
        : [[]];
    const [allVotes] =
      electionIds.length > 0
        ? await pool.query(
            "SELECT election_id, encrypted_ballot FROM votes_meta WHERE election_id IN (?)",
            [electionIds],
          )
        : [[]];

    const candidatesByElection = new Map();
    for (const c of allCandidates) {
      if (!candidatesByElection.has(c.election_id)) {
        candidatesByElection.set(c.election_id, []);
      }
      candidatesByElection.get(c.election_id).push(c);
    }

    for (const election of elections) {
      const candidates = candidatesByElection.get(election.id) || [];
      const votes = allVotes.filter((v) => v.election_id === election.id);
      const tally = computeTally(election, votes);

      if (election.results_released) {
        // Plaintext tally
        election.candidates = candidates.map((c) => ({
          ...c,
          votes_count: tally[c.id] || 0,
        }));
        election.resultsReleased = true;
      } else {
        // No tally exposed before release (H-17, M-44)
        election.candidates = candidates.map((c) => ({
          ...c,
          votes_count: null,
        }));
        election.resultsReleased = false;
      }
    }

    res.json(elections.map(({ tally_key, ...safe }) => safe));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/audit-logs
// @desc    Get audit logs (admin only)
// @access  Admin only
router.get("/admin/audit-logs", auth, adminAuth, async (req, res) => {
  try {
    const { adminId, limit = 100, offset = 0 } = req.query;
    const clientIp = getClientIp(req);

    const logs = await adminLogger.getAdminLogs(
      adminId || req.user.id,
      parseInt(limit),
      parseInt(offset),
    );

    // Log the audit access
    await adminLogger.logSecurityEvent(
      req.user.id,
      "AUDIT_LOG_ACCESSED",
      "LOW",
      `Admin accessed audit logs for admin #${adminId || req.user.id}`,
      { targetAdminId: adminId || req.user.id, ipAddress: clientIp },
    );

    res.json({ logs: logs.logs, total: logs.total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/security-logs
// @desc    Get security logs (admin only)
// @access  Admin only
router.get("/admin/security-logs", auth, adminAuth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const logs = await adminLogger.getSecurityLogs(
      parseInt(limit),
      parseInt(offset),
    );

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/admin/verify-audit-integrity
// @desc    Verify integrity of audit log
// @access  Admin only
router.post(
  "/admin/verify-audit-integrity/:logId",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const { logId } = req.params;
      const adminId = req.user.id;
      const clientIp = getClientIp(req);

      const result = await adminLogger.verifyAuditIntegrity(logId);

      // Log the verification
      await adminLogger.logSecurityEvent(
        adminId,
        "AUDIT_INTEGRITY_CHECK",
        "MEDIUM",
        `Audit integrity verified for log #${logId} - Result: ${result.valid ? "VALID" : "INVALID"}`,
        { logId, valid: result.valid, ipAddress: clientIp },
      );

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// @route   POST /api/elections/:id/release
// @desc    Release election results (decrypt tally)
// @access  Admin only
router.post("/:id/release", auth, adminAuth, async (req, res) => {
  try {
    const electionId = req.params.id;

    const [elections] = await pool.query(
      "SELECT id, results_released FROM elections WHERE id = ?",
      [electionId],
    );

    if (elections.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    if (elections[0].results_released) {
      return res.status(400).json({ message: "Results already released" });
    }

    await pool.query(
      "UPDATE elections SET results_released = TRUE, results_released_at = NOW() WHERE id = ?",
      [electionId],
    );

    res.json({
      message: "Results released successfully",
      resultsReleased: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
