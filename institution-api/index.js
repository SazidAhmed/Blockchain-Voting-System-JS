/**
 * Mock Institutional Database API
 * Simulates a university's student/staff directory for testing purposes.
 * In a real deployment this would be replaced by the institution's LDAP/SSO/API.
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, 'data', 'institution.db');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Database setup ────────────────────────────────────────────────────────────
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    institution_id TEXT UNIQUE NOT NULL,
    full_name     TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    role          TEXT NOT NULL CHECK(role IN ('student','teacher','staff')),
    department    TEXT NOT NULL,
    year          TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_institution_id ON members(institution_id);
`);

// ── Seeder ────────────────────────────────────────────────────────────────────
function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM members').get().cnt;
  if (count > 0) {
    console.log(`✓ Database already seeded with ${count} members`);
    return;
  }

  console.log('→ Seeding institution database...');

  const firstNames = [
    'James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda',
    'William','Barbara','David','Elizabeth','Richard','Susan','Joseph','Jessica',
    'Thomas','Sarah','Charles','Karen','Christopher','Lisa','Daniel','Nancy',
    'Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley',
    'Steven','Emily','Paul','Donna','Andrew','Michelle','Joshua','Carol',
    'Kenneth','Amanda','Kevin','Dorothy','Brian','Melissa','George','Deborah',
    'Timothy','Stephanie','Ronald','Rebecca','Edward','Sharon','Jason','Laura',
    'Jeffrey','Cynthia','Ryan','Kathleen','Jacob','Amy','Gary','Angela',
    'Nicholas','Shirley','Eric','Anna','Jonathan','Brenda','Stephen','Pamela',
    'Larry','Emma','Justin','Nicole','Scott','Helen','Brandon','Samantha',
    'Benjamin','Katherine','Samuel','Christine','Raymond','Debra','Gregory','Rachel',
    'Frank','Carolyn','Alexander','Janet','Patrick','Maria','Jack','Olivia',
    'Dennis','Heather','Jerry','Amber','Tyler','Denise','Aaron','Megan',
    'Jose','Danielle','Adam','Marilyn','Nathan','Beverly','Henry','Brittany',
    'Douglas','Diana','Zachary','Theresa','Peter','Natalie','Kyle','Kelly',
    'Ethan','Hannah','Walter','Sarah','Noah','Sophia','Jeremy','Evelyn',
    'Christian','Victoria','Harold','Lori','Keith','Lauren','Roger','Alice',
    'Terry','Madison','Gerald','Grace','Sean','Judith','Carl','Julia',
    'Dylan','Catherine','Arthur','Abigail','Lawrence','Alexis','Jordan','Kayla'
  ];

  const lastNames = [
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
    'Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas',
    'Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White',
    'Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young',
    'Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
    'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell',
    'Carter','Roberts','Gomez','Phillips','Evans','Turner','Diaz','Parker',
    'Cruz','Edwards','Collins','Reyes','Stewart','Morris','Morales','Murphy',
    'Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper','Peterson','Bailey',
    'Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson',
    'Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza',
    'Ruiz','Hughes','Price','Alvarez','Castillo','Sanders','Patel','Myers',
    'Long','Ross','Foster','Jimenez','Powell','Jenkins','Perry','Russell',
    'Sullivan','Bell','Coleman','Butler','Henderson','Barnes','Gonzales','Fisher',
    'Vasquez','Simmons','Romero','Jordan','Patterson','Alexander','Hamilton','Graham'
  ];

  const departments = {
    student: [
      'Computer Science','Information Technology','Electrical Engineering',
      'Mechanical Engineering','Civil Engineering','Business Administration',
      'Economics','Mathematics','Physics','Chemistry','Biology',
      'Psychology','Sociology','English Literature','History',
      'Political Science','Architecture','Nursing','Pharmacy','Law'
    ],
    teacher: [
      'Computer Science','Electrical Engineering','Mechanical Engineering',
      'Business Administration','Economics','Mathematics','Physics',
      'Chemistry','Biology','Psychology','English','History','Law','Architecture'
    ],
    staff: [
      'Administration','Finance','Human Resources','IT Support',
      'Library','Student Affairs','Registrar','Security','Facilities',
      'Research Office','International Office'
    ]
  };

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  const insert = db.prepare(`
    INSERT INTO members (institution_id, full_name, email, role, department, year)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((members) => {
    for (const m of members) insert.run(m.id, m.name, m.email, m.role, m.dept, m.year);
  });

  const members = [];
  let stuCount = 0, teachCount = 0, staffCount = 0;

  // Helper: deterministic but varied picks
  function pick(arr, seed) {
    return arr[seed % arr.length];
  }

  // Generate 350 students
  for (let i = 1; i <= 350; i++) {
    stuCount++;
    const id = `STU${String(i).padStart(5, '0')}`;
    const fn = pick(firstNames, i * 7);
    const ln = pick(lastNames, i * 13);
    const name = `${fn} ${ln}`;
    const emailLocal = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}`;
    const email = `${emailLocal}@university.edu`;
    const dept = pick(departments.student, i * 3);
    const year = pick(years, i);
    members.push({ id, name, email, role: 'student', dept, year });
  }

  // Generate 100 teachers
  for (let i = 1; i <= 100; i++) {
    teachCount++;
    const id = `TEACH${String(i).padStart(4, '0')}`;
    const fn = pick(firstNames, i * 11 + 5);
    const ln = pick(lastNames, i * 17 + 3);
    const name = `Dr. ${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@faculty.university.edu`;
    const dept = pick(departments.teacher, i * 5);
    members.push({ id, name, email, role: 'teacher', dept, year: null });
  }

  // Generate 50 staff
  for (let i = 1; i <= 50; i++) {
    staffCount++;
    const id = `STAFF${String(i).padStart(4, '0')}`;
    const fn = pick(firstNames, i * 19 + 9);
    const ln = pick(lastNames, i * 23 + 7);
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@staff.university.edu`;
    const dept = pick(departments.staff, i * 7);
    members.push({ id, name, email, role: 'staff', dept, year: null });
  }

  insertMany(members);

  console.log(`  ✓ Seeded ${stuCount} students, ${teachCount} teachers, ${staffCount} staff`);
  console.log(`  ✓ Total: ${members.length} members`);
}

seedDatabase();

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM members').get().cnt;
  res.json({ status: 'ok', members: count });
});

// Lookup a single member by institution ID
app.get('/api/lookup/:institutionId', (req, res) => {
  const { institutionId } = req.params;
  const member = db.prepare('SELECT * FROM members WHERE institution_id = ?').get(institutionId.toUpperCase());

  if (!member) {
    return res.status(404).json({ message: 'Institution ID not found. Please check your ID and try again.' });
  }

  res.json({
    institutionId: member.institution_id,
    fullName: member.full_name,
    email: member.email,
    role: member.role,
    department: member.department,
    year: member.year
  });
});

// List all members (paginated) — for admin/debugging use
app.get('/api/members', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const role = req.query.role;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM members';
  let countQuery = 'SELECT COUNT(*) as cnt FROM members';
  const params = [];

  if (role) {
    query += ' WHERE role = ?';
    countQuery += ' WHERE role = ?';
    params.push(role);
  }

  query += ' ORDER BY institution_id LIMIT ? OFFSET ?';

  const members = db.prepare(query).all(...params, limit, offset);
  const total = db.prepare(countQuery).get(...params).cnt;

  res.json({
    members,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

// Search members by name or ID (for testing purposes)
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return res.status(400).json({ message: 'Search query must be at least 2 characters' });
  }

  const results = db.prepare(`
    SELECT institution_id, full_name, email, role, department
    FROM members
    WHERE institution_id LIKE ? OR full_name LIKE ?
    LIMIT 20
  `).all(`%${q}%`, `%${q}%`);

  res.json({ results });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  Institution API running on port ${PORT}`);
  console.log(`========================================`);
  console.log(`  Lookup:  GET /api/lookup/:institutionId`);
  console.log(`  Search:  GET /api/search?q=...`);
  console.log(`  Members: GET /api/members?role=student&page=1`);
  console.log(`  Health:  GET /api/health\n`);
});
