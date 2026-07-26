const { pool } = require("../config/db");

pool
  .query(
    `CREATE TABLE IF NOT EXISTS token_blacklist (
  jti VARCHAR(255) PRIMARY KEY,
  expires_at BIGINT NOT NULL,
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  )
  .catch((err) => {
    console.error("Failed to create token_blacklist table:", err.message);
  });

module.exports = {
  async add(token) {
    await pool.query(
      "INSERT INTO token_blacklist (jti, expires_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)",
      [token, Date.now() + 3600000],
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
};
