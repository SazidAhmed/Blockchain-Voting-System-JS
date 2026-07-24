const { pool } = require('../../config/db');

function pad(str, len) {
  return String(str ?? '').padEnd(len);
}

function printTable(users) {
  const cols = { id: 6, institution_id: 15, username: 22, email: 32, role: 10, status: 12 };
  const line = '-'.repeat(Object.values(cols).reduce((a, b) => a + b, 0) + Object.keys(cols).length * 3 + 1);

  console.log(line);
  console.log(
    `| ${pad('DB ID', cols.id)} | ${pad('Institution ID', cols.institution_id)} | ${pad('Username', cols.username)} | ${pad('Email', cols.email)} | ${pad('Role', cols.role)} | ${pad('Status', cols.status)} |`
  );
  console.log(line);

  users.forEach(u => {
    console.log(
      `| ${pad(u.user_id, cols.id)} | ${pad(u.institution_id, cols.institution_id)} | ${pad(u.username, cols.username)} | ${pad(u.email, cols.email)} | ${pad(u.role, cols.role)} | ${pad(u.registration_status, cols.status)} |`
    );
  });

  console.log(line);
}

async function checkUsers() {
  try {
    console.log('Connecting to database...');
    const [users] = await pool.execute(
      `SELECT id as user_id, institution_id, username, email, role, registration_status
       FROM users
       ORDER BY role, institution_id`
    );

    const total = users.length;

    if (total === 0) {
      console.log('\nNo users found in the database.');
      console.log(`Register users at ${process.env.FRONTEND_URL || 'http://localhost:5173'}/register`);
    } else {
      console.log(`\n=== Registered Users (${total} total) ===\n`);
      printTable(users);

      // Summary by role
      const byRole = users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {});
      console.log('\nSummary by role:');
      Object.entries(byRole).sort().forEach(([role, count]) => {
        console.log(`  ${role.padEnd(12)} ${count}`);
      });

      // Quick-reference list of emails and institution IDs
      console.log('\n=== Registered Emails & Institution IDs ===\n');
      console.log('  Institution ID   Email');
      console.log('  ' + '-'.repeat(50));
      users.forEach(u => {
        console.log(`  ${pad(u.institution_id, 16)} ${u.email || '(no email)'}`);
      });
    }

    const [elections] = await pool.execute('SELECT id as election_id, title, status FROM elections');
    console.log('\n=== Elections ===');
    if (elections.length === 0) {
      console.log('  No elections found.');
    } else {
      elections.forEach(e => {
        console.log(`  [${e.election_id}] ${e.title} — ${e.status}`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
