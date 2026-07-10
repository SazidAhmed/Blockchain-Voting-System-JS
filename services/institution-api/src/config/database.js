const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:              process.env.DB_HOST     || 'localhost',
      port:              parseInt(process.env.DB_PORT || '3306'),
      user:              process.env.DB_USER     || 'voting_user',
      password:          process.env.DB_PASSWORD || 'voting_pass',
      database:          process.env.DB_NAME     || 'institution_db',
      waitForConnections: true,
      connectionLimit:   10
    });
  }
  return pool;
}

async function initDatabase() {
  const dbName = process.env.DB_NAME     || 'institution_db';
  const dbUser = process.env.DB_USER     || 'voting_user';
  const root = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     'root',
    password: process.env.DB_ROOT_PASSWORD || 'voting_root_pass'
  });
  await root.query('CREATE DATABASE IF NOT EXISTS ' + dbName + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await root.query('GRANT ALL PRIVILEGES ON ' + dbName + '.* TO \'' + dbUser + '\'@\'%\'');
  await root.query('FLUSH PRIVILEGES');
  await root.end();
  console.log('Database ready: ' + dbName);

  const db = getPool();
  await db.query([
    'CREATE TABLE IF NOT EXISTS institution_members (',
    '  id             INT AUTO_INCREMENT PRIMARY KEY,',
    '  institution_id VARCHAR(20)  UNIQUE NOT NULL,',
    '  full_name      VARCHAR(100) NOT NULL,',
    '  email          VARCHAR(120) UNIQUE NOT NULL,',
    '  role           ENUM(\'student\',\'teacher\',\'staff\') NOT NULL,',
    '  department     VARCHAR(100) NOT NULL,',
    '  year_level     VARCHAR(20)  NULL,',
    '  is_voter       BOOLEAN NOT NULL DEFAULT FALSE,',
    '  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,',
    '  INDEX idx_institution_id (institution_id),',
    '  INDEX idx_role (role)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  ].join(' '));

  try {
    await db.query('ALTER TABLE institution_members ADD COLUMN is_voter BOOLEAN NOT NULL DEFAULT FALSE');
    console.log('Migrated: added is_voter column');
  } catch (e) {
    if (!e.message.includes('Duplicate column name')) throw e;
  }

  const [[row]] = await db.query('SELECT COUNT(*) AS cnt FROM institution_members');
  if (row.cnt > 0) { console.log('Already seeded: ' + row.cnt + ' members'); return; }
  const { seedMembers } = require('./seed');
  await seedMembers(db);
}

module.exports = { getPool, initDatabase };
