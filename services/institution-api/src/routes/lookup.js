const { Router } = require("express");
const { getPool } = require("../config/database");
const { apiKeyAuth } = require("../middleware/auth");

const router = Router();

router.get("/api/lookup/:institutionId", async (req, res) => {
  try {
    const [[row]] = await getPool().query(
      "SELECT institution_id, full_name, email, role, department, year_level, is_voter FROM institution_members WHERE institution_id = ?",
      [req.params.institutionId.toUpperCase()],
    );
    if (!row)
      return res.status(404).json({
        message:
          "Institution ID not found. Please check your ID and try again.",
      });
    res.json({
      institutionId: row.institution_id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      department: row.department,
      year: row.year_level,
      isVoter: row.is_voter === 1 || row.is_voter === true,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/api/search", apiKeyAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2)
      return res
        .status(400)
        .json({ message: "Query must be at least 2 characters" });
    const [results] = await getPool().query(
      "SELECT institution_id, full_name, email, role, department, year_level, is_voter FROM institution_members WHERE institution_id LIKE ? OR full_name LIKE ? LIMIT 20",
      [q + "%", "%" + q + "%"],
    );
    // full_name uses leading-wildcard LIKE — add FULLTEXT index on full_name if search volume grows
    res.json({ results });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
