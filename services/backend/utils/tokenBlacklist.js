const { pool } = require("../config/db");

// token_blacklist table DDL lives in migrations/001_initial_schema.sql (M-09)

module.exports = {
  // expiresAtMs optional; falls back to JWT exp (ms) or +1h
  async add(token, expiresAtMs) {
    if (expiresAtMs === undefined) {
      const decoded = require("jsonwebtoken").decode(token);
      expiresAtMs =
        decoded && decoded.exp ? decoded.exp * 1000 : Date.now() + 3600000;
    }
    await pool.query(
      "INSERT INTO token_blacklist (jti, expires_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)",
      [token, expiresAtMs],
    );
  },
  async has(token) {
    const [rows] = await pool.query(
      "SELECT 1 FROM token_blacklist WHERE jti = ? AND expires_at > ?",
      [token, Date.now()],
    );
    return rows.length > 0;
  },
  async remove(token) {
    await pool.query("DELETE FROM token_blacklist WHERE jti = ?", [token]);
  },
  async clear() {
    await pool.query("DELETE FROM token_blacklist");
  },
  // Periodic cleanup of expired entries (M-05)
  async cleanupExpired() {
    await pool.query("DELETE FROM token_blacklist WHERE expires_at <= ?", [
      Date.now(),
    ]);
  },
};

// Run cleanup hourly
setInterval(() => {
  module.exports
    .cleanupExpired()
    .catch((err) =>
      console.error("Token blacklist cleanup failed:", err.message),
    );
}, 3600000);
