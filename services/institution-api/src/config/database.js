const mysql = require("mysql2/promise");

let pool;

function getPool() {
  if (!pool) {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd && !process.env.DB_USER)
      throw new Error("DB_USER must be set in production");
    if (isProd && !process.env.DB_PASSWORD)
      throw new Error("DB_PASSWORD must be set in production");
    const user =
      process.env.DB_USER ||
      (console.warn("WARNING: using default DB_USER (voting_user)"),
      "voting_user");
    const password =
      process.env.DB_PASSWORD ||
      (console.warn("WARNING: using default DB_PASSWORD"), "voting_pass");
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306"),
      user,
      password,
      database: process.env.DB_NAME || "institution_db",
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 10000,
      charset: "utf8mb4",
      idleTimeout: 60000,
    });
  }
  return pool;
}

async function initDatabase() {
  const dbName =
    process.env.DB_NAME ||
    (console.warn("WARNING: using default DB_NAME (institution_db)"),
    "institution_db");
  const dbUser = process.env.DB_USER || "voting_user";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName))
    throw new Error("Invalid database name: " + dbName);
  const root = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: "root",
    password:
      process.env.DB_ROOT_PASSWORD ||
      (console.warn("WARNING: using default DB_ROOT_PASSWORD"),
      "voting_root_pass"),
  });
  const escapedDb = mysql.escapeId(dbName);
  await root.query(
    "CREATE DATABASE IF NOT EXISTS " +
      escapedDb +
      " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
  );
  await root.query(
    "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON " +
      escapedDb +
      ".* TO '" +
      dbUser +
      "'@'%'",
  );
  await root.query("FLUSH PRIVILEGES");
  await root.end();
  console.log("Database ready: " + dbName);

  const db = getPool();
  await db.query(
    [
      "CREATE TABLE IF NOT EXISTS institution_members (",
      "  id             INT AUTO_INCREMENT PRIMARY KEY,",
      "  institution_id VARCHAR(20)  UNIQUE NOT NULL,",
      "  full_name      VARCHAR(100) NOT NULL,",
      "  email          VARCHAR(120) UNIQUE NOT NULL,",
      "  role           ENUM('student','teacher','staff') NOT NULL,",
      "  department     VARCHAR(100) NOT NULL,",
      "  year_level     VARCHAR(20)  NULL,",
      "  is_voter       BOOLEAN NOT NULL DEFAULT FALSE,",
      "  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,",
      "  INDEX idx_institution_id (institution_id),",
      "  INDEX idx_voter_role_id (is_voter, role, institution_id),",
      "  FULLTEXT INDEX ft_members_name (full_name)",
      ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ].join(" "),
  );

  const [[col]] = await db.query(
    "SELECT COUNT(*) AS found FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'institution_members' AND COLUMN_NAME = 'is_voter'",
    [dbName],
  );
  if (!col.found) {
    await db.query(
      "ALTER TABLE institution_members ADD COLUMN is_voter BOOLEAN NOT NULL DEFAULT FALSE",
    );
    console.log("Migrated: added is_voter column");
  }

  // Add composite + fulltext indexes if missing (for databases created before this migration)
  const [[hasComposite]] = await db.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'institution_members' AND INDEX_NAME = 'idx_voter_role_id'",
    [dbName],
  );
  if (!hasComposite.cnt)
    await db.query(
      "ALTER TABLE institution_members ADD INDEX idx_voter_role_id (is_voter, role, institution_id)",
    );
  const [[hasFulltext]] = await db.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'institution_members' AND INDEX_NAME = 'ft_members_name'",
    [dbName],
  );
  if (!hasFulltext.cnt)
    await db.query(
      "ALTER TABLE institution_members ADD FULLTEXT INDEX ft_members_name (full_name)",
    );

  const [[row]] = await db.query(
    "SELECT COUNT(*) AS cnt FROM institution_members",
  );
  if (row.cnt > 0) {
    console.log("Already seeded: " + row.cnt + " members");
    return;
  }
  const { seedMembers } = require("./seed");
  await seedMembers(db);
}

module.exports = { getPool, initDatabase };
