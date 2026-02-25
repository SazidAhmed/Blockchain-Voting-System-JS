/**
 * Mock Institutional Database API
 * Simulates a university directory. Uses MySQL — visible in phpMyAdmin at localhost:8080.
 */

const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql2/promise');

const app  = express();
const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());

let pool;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:             process.env.DB_HOST     || 'localhost',
      port:             parseInt(process.env.DB_PORT || '3306'),
      user:             process.env.DB_USER     || 'voting_user',
      password:         process.env.DB_PASSWORD || 'voting_pass',
      database:         process.env.DB_NAME     || 'institution_db',
      waitForConnections: true,
      connectionLimit:  10
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
    '  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,',
    '  INDEX idx_institution_id (institution_id),',
    '  INDEX idx_role (role)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  ].join(' '));

  const [[row]] = await db.query('SELECT COUNT(*) AS cnt FROM institution_members');
  if (row.cnt > 0) { console.log('Already seeded: ' + row.cnt + ' members'); return; }
  await seedMembers(db);
}

async function seedMembers(db) {
  const firstNames = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda',
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
    'Dylan','Catherine','Arthur','Abigail','Lawrence','Alexis','Jordan','Kayla'];

  const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
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
    'Vasquez','Simmons','Romero','Jordan','Patterson','Alexander','Hamilton','Graham'];

  const stuDepts  = ['Computer Science','Information Technology','Electrical Engineering','Mechanical Engineering','Civil Engineering','Business Administration','Economics','Mathematics','Physics','Chemistry','Biology','Psychology','Sociology','English Literature','History','Political Science','Architecture','Nursing','Pharmacy','Law'];
  const teachDepts= ['Computer Science','Electrical Engineering','Mechanical Engineering','Business Administration','Economics','Mathematics','Physics','Chemistry','Biology','Psychology','English','History','Law','Architecture'];
  const staffDepts= ['Administration','Finance','Human Resources','IT Support','Library','Student Affairs','Registrar','Security','Facilities','Research Office','International Office'];
  const years = ['1st Year','2nd Year','3rd Year','4th Year'];
  const pick = (arr, seed) => arr[seed % arr.length];
  const rows = [];

  for (let i = 1; i <= 350; i++) {
    const fn = pick(firstNames, i*7), ln = pick(lastNames, i*13);
    rows.push(['STU' + String(i).padStart(5,'0'), fn+' '+ln,
      fn.toLowerCase()+'.'+ln.toLowerCase()+i+'@university.edu',
      'student', pick(stuDepts, i*3), pick(years, i)]);
  }
  for (let i = 1; i <= 100; i++) {
    const fn = pick(firstNames, i*11+5), ln = pick(lastNames, i*17+3);
    rows.push(['TEACH' + String(i).padStart(4,'0'), 'Dr. '+fn+' '+ln,
      fn.toLowerCase()+'.'+ln.toLowerCase()+'@faculty.university.edu',
      'teacher', pick(teachDepts, i*5), null]);
  }
  for (let i = 1; i <= 50; i++) {
    const fn = pick(firstNames, i*19+9), ln = pick(lastNames, i*23+7);
    rows.push(['STAFF' + String(i).padStart(4,'0'), fn+' '+ln,
      fn.toLowerCase()+'.'+ln.toLowerCase()+'@staff.university.edu',
      'staff', pick(staffDepts, i*7), null]);
  }

  for (let i = 0; i < rows.length; i += 50) {
    await db.query('INSERT INTO institution_members (institution_id, full_name, email, role, department, year_level) VALUES ?', [rows.slice(i, i+50)]);
  }
  console.log('Seeded 500 members: 350 students / 100 teachers / 50 staff');
}

app.get('/api/health', async (_req, res) => {
  try {
    const [[row]] = await getPool().query('SELECT COUNT(*) AS cnt FROM institution_members');
    res.json({ status: 'ok', members: row.cnt });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

app.get('/api/lookup/:institutionId', async (req, res) => {
  try {
    const [[row]] = await getPool().query(
      'SELECT * FROM institution_members WHERE institution_id = ?',
      [req.params.institutionId.toUpperCase()]
    );
    if (!row) return res.status(404).json({ message: 'Institution ID not found. Please check your ID and try again.' });
    res.json({ institutionId: row.institution_id, fullName: row.full_name,
      email: row.email, role: row.role, department: row.department, year: row.year_level });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/members', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const role = req.query.role;
    const offset = (page - 1) * limit;
    const where = role ? 'WHERE role = ?' : '';
    const params = role ? [role] : [];
    const db = getPool();
    const [members] = await db.query('SELECT * FROM institution_members ' + where + ' ORDER BY institution_id LIMIT ? OFFSET ?', [...params, limit, offset]);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM institution_members ' + where, params);
    res.json({ members, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.status(400).json({ message: 'Query must be at least 2 characters' });
    const [results] = await getPool().query(
      'SELECT institution_id, full_name, email, role, department FROM institution_members WHERE institution_id LIKE ? OR full_name LIKE ? LIMIT 20',
      ['%' + q + '%', '%' + q + '%']
    );
    res.json({ results });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

async function start() {
  for (let attempt = 1; attempt <= 15; attempt++) {
    try { await initDatabase(); break; }
    catch (err) {
      console.log('Attempt ' + attempt + '/15 - DB not ready: ' + err.message);
      if (attempt === 15) { process.exit(1); }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  app.listen(PORT, '0.0.0.0', () => console.log('Institution API on port ' + PORT));
}

start();
