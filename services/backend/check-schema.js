const { pool } = require('./config/db');

async function checkSchema() {
  try {
    console.log('Checking database schema...\n');
    
    // Check users table
    const [usersColumns] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'voting'
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('public_key', 'encryption_public_key')
      ORDER BY COLUMN_NAME
    `);
    
    console.log('Users table columns:');
    if (usersColumns.length > 0) {
      usersColumns.forEach(col => {
        console.log(`  ✓ ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.COLUMN_COMMENT || 'No comment'}`);
      });
    } else {
      console.log('  ✗ No crypto columns found!');
    }
    
    // Check votes_meta table
    const [votesColumns] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'voting'
      AND TABLE_NAME = 'votes_meta'
      AND COLUMN_NAME IN ('signature', 'voter_public_key')
      ORDER BY COLUMN_NAME
    `);
    
    console.log('\nVotes_meta table columns:');
    if (votesColumns.length > 0) {
      votesColumns.forEach(col => {
        console.log(`  ✓ ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.COLUMN_COMMENT || 'No comment'}`);
      });
    } else {
      console.log('  ✗ No crypto columns found!');
    }
    
    await pool.end();
    console.log('\n✓ Schema check complete!');
    
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkSchema();
