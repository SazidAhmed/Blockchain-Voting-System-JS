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
    '  is_voter       BOOLEAN NOT NULL DEFAULT FALSE,',
    '  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,',
    '  INDEX idx_institution_id (institution_id),',
    '  INDEX idx_role (role)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  ].join(' '));

  // Migrate existing tables that predate the is_voter column
  try {
    await db.query('ALTER TABLE institution_members ADD COLUMN is_voter BOOLEAN NOT NULL DEFAULT FALSE');
    console.log('Migrated: added is_voter column');
  } catch (e) {
    if (!e.message.includes('Duplicate column name')) throw e;
    // Column already exists — nothing to do
  }

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

// Mark / unmark an institution member as a registered voter
app.patch('/api/members/:institutionId/voter', async (req, res) => {
  try {
    const id = req.params.institutionId.toUpperCase();
    const isVoter = req.body.is_voter !== false; // default true
    const [r] = await getPool().query(
      'UPDATE institution_members SET is_voter = ? WHERE institution_id = ?',
      [isVoter, id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Institution ID not found' });
    res.json({ institutionId: id, is_voter: isVoter });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/lookup/:institutionId', async (req, res) => {
  try {
    const [[row]] = await getPool().query(
      'SELECT * FROM institution_members WHERE institution_id = ?',
      [req.params.institutionId.toUpperCase()]
    );
    if (!row) return res.status(404).json({ message: 'Institution ID not found. Please check your ID and try again.' });
    res.json({ institutionId: row.institution_id, fullName: row.full_name,
      email: row.email, role: row.role, department: row.department, year: row.year_level, isVoter: row.is_voter === 1 || row.is_voter === true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/members', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const role    = req.query.role    || null;
    const voter   = req.query.voter;   // 'true' | 'false' | undefined
    const offset  = (page - 1) * limit;
    const conditions = [];
    const params = [];
    if (role)              { conditions.push('role = ?');     params.push(role); }
    if (voter === 'true')  { conditions.push('is_voter = 1'); }
    if (voter === 'false') { conditions.push('is_voter = 0'); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const db = getPool();
    const [members] = await db.query(
      'SELECT id, institution_id, full_name, email, role, department, year_level, is_voter FROM institution_members ' + where + ' ORDER BY is_voter ASC, role, institution_id LIMIT ? OFFSET ?',
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM institution_members ' + where, params);
    const [[counts]] = await db.query('SELECT SUM(is_voter) AS voters, COUNT(*) AS total FROM institution_members');
    res.json({ members, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, stats: { total: counts.total, voters: counts.voters || 0, available: counts.total - (counts.voters || 0) } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.status(400).json({ message: 'Query must be at least 2 characters' });
    const [results] = await getPool().query(
      'SELECT institution_id, full_name, email, role, department, year_level, is_voter FROM institution_members WHERE institution_id LIKE ? OR full_name LIKE ? LIMIT 20',
      ['%' + q + '%', '%' + q + '%']
    );
    res.json({ results });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── Voter Picker UI ────────────────────────────────────────────────────────
app.get('/voter-picker', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Voter Picker — Dev Tool</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
  header{background:#1e293b;padding:18px 24px;border-bottom:1px solid #334155;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  header h1{font-size:1.25rem;font-weight:700;color:#f1f5f9}header span{font-size:.8rem;background:#334155;padding:3px 10px;border-radius:9999px}
  .stats{display:flex;gap:12px;margin:20px 24px 0;flex-wrap:wrap}
  .stat{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px 20px;min-width:130px}
  .stat .n{font-size:1.8rem;font-weight:700;line-height:1}
  .stat .l{font-size:.75rem;color:#94a3b8;margin-top:4px}
  .stat.green .n{color:#4ade80} .stat.red .n{color:#f87171} .stat.blue .n{color:#60a5fa}
  .controls{display:flex;gap:10px;margin:16px 24px;flex-wrap:wrap;align-items:center}
  input[type=search]{background:#1e293b;border:1px solid #475569;border-radius:8px;padding:8px 14px;color:#e2e8f0;font-size:.9rem;width:260px}
  input[type=search]::placeholder{color:#64748b}
  .filters{display:flex;gap:6px;flex-wrap:wrap}
  .btn{border:1px solid #475569;background:transparent;color:#94a3b8;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:.85rem;transition:all .15s}
  .btn:hover{border-color:#60a5fa;color:#60a5fa}
  .btn.active{background:#3b82f6;border-color:#3b82f6;color:#fff;font-weight:600}
  .table-wrap{margin:0 24px 40px;overflow-x:auto;border-radius:10px;border:1px solid #334155}
  table{width:100%;border-collapse:collapse;font-size:.85rem}
  thead tr{background:#1e293b;border-bottom:2px solid #334155}
  th{padding:10px 14px;text-align:left;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;white-space:nowrap}
  td{padding:10px 14px;border-bottom:1px solid #1e293b;white-space:nowrap}
  tr:last-child td{border-bottom:none}
  tr.available:hover{background:#172033} tr.taken{opacity:.55} tr.taken:hover{background:#1a1427}
  .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:9999px;font-size:.75rem;font-weight:600}
  .badge.avail{background:#14532d;color:#4ade80} .badge.taken{background:#2d1515;color:#f87171}
  .role-badge{padding:2px 8px;border-radius:4px;font-size:.75rem}
  .role-badge.student{background:#1e3a5f;color:#60a5fa}
  .role-badge.teacher{background:#2d1b69;color:#a78bfa}
  .role-badge.staff{background:#1a3327;color:#34d399}
  .copy-btn{background:none;border:1px solid #334155;border-radius:4px;color:#94a3b8;padding:2px 7px;font-size:.75rem;cursor:pointer;margin-left:4px}
  .copy-btn:hover{border-color:#60a5fa;color:#60a5fa}
  .pagination{display:flex;gap:8px;align-items:center;justify-content:center;margin:0 24px 24px}
  .pager{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:6px 14px;cursor:pointer;color:#e2e8f0;font-size:.85rem}
  .pager:disabled{opacity:.4;cursor:default} .pager:not(:disabled):hover{border-color:#60a5fa;color:#60a5fa}
  #pageInfo{color:#94a3b8;font-size:.85rem}
  .register-url{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px 16px;margin:0 24px 16px;font-size:.8rem;color:#64748b}
  .register-url a{color:#60a5fa;text-decoration:none} .register-url a:hover{text-decoration:underline}
  #status-msg{position:fixed;bottom:20px;right:20px;background:#1e293b;border:1px solid #334155;padding:10px 16px;border-radius:8px;font-size:.85rem;opacity:0;transition:opacity .3s;pointer-events:none}
  #status-msg.show{opacity:1}
</style>
</head>
<body>
<header>
  <h1>&#127939; Voter Picker</h1>
  <span>Dev Tool</span>
  <span style="color:#94a3b8;font-size:.8rem">Pick an unused row to register in the voting app</span>
</header>

<div class="stats" id="stats"></div>

<div class="register-url">
  Register at: <a href="http://localhost:5173/register" target="_blank">http://localhost:5173/register</a>
  &nbsp;|&nbsp; Admin panel: <a href="http://localhost:5174" target="_blank">http://localhost:5174</a>
</div>

<div class="controls">
  <input type="search" id="search" placeholder="Search name or ID…" />
  <div class="filters">
    <button class="btn active" data-role="">All</button>
    <button class="btn" data-role="student">Students</button>
    <button class="btn" data-role="teacher">Teachers</button>
    <button class="btn" data-role="staff">Staff</button>
    <button class="btn" data-voter="false" id="availBtn">Available only</button>
  </div>
</div>

<div class="table-wrap">
  <table>
    <thead><tr>
      <th>Status</th><th>Institution ID</th><th>Full Name</th>
      <th>Email</th><th>Role</th><th>Department</th><th>Year</th>
    </tr></thead>
    <tbody id="tbody"><tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b">Loading…</td></tr></tbody>
  </table>
</div>

<div class="pagination">
  <button class="pager" id="firstBtn" onclick="goToPage(1)">&#8676; First</button>
  <button class="pager" id="prevBtn" onclick="changePage(-1)">&#8592; Prev</button>
  <span id="pageInfo"></span>
  <button class="pager" id="nextBtn" onclick="changePage(1)">Next &#8594;</button>
  <button class="pager" id="lastBtn" onclick="goToPage(state.lastPage)">Last &#8677;</button>
</div>

<div id="status-msg"></div>

<script>
const LIMIT = 20;
let state = { page: 1, role: '', voterFilter: null, search: '', lastPage: 1 };
let debounceTimer;

async function load() {
  const params = new URLSearchParams({ page: state.page, limit: LIMIT });
  if (state.role)        params.set('role',  state.role);
  if (state.voterFilter !== null) params.set('voter', state.voterFilter);
  if (state.search)     params.set('q', state.search);
  const url = state.search && state.search.length >= 2
    ? '/api/search?' + new URLSearchParams({ q: state.search })
    : '/api/members?' + params;

  let data;
  try {
    const r = await fetch(url);
    data = await r.json();
  } catch (err) {
    document.getElementById('tbody').innerHTML =
      '<tr><td colspan="7" style="text-align:center;padding:40px;color:#f87171">⚠ Failed to load: ' + err.message + '</td></tr>';
    return;
  }
  const members = state.search && state.search.length >= 2 ? data.results : data.members;

  // stats
  if (data.stats) {
    document.getElementById('stats').innerHTML =
      '<div class="stat blue"><div class="n">' + data.stats.total + '</div><div class="l">Total members</div></div>' +
      '<div class="stat green"><div class="n">' + data.stats.available + '</div><div class="l">Available</div></div>' +
      '<div class="stat red"><div class="n">' + data.stats.voters + '</div><div class="l">Registered voters</div></div>';
  }

  // pagination
  if (data.pagination) {
    state.lastPage = data.pagination.pages;
    document.getElementById('pageInfo').textContent = 'Page ' + data.pagination.page + ' of ' + data.pagination.pages + ' (' + data.pagination.total + ' rows)';
    const atFirst = data.pagination.page <= 1;
    const atLast  = data.pagination.page >= data.pagination.pages;
    document.getElementById('firstBtn').disabled = atFirst;
    document.getElementById('prevBtn').disabled  = atFirst;
    document.getElementById('nextBtn').disabled  = atLast;
    document.getElementById('lastBtn').disabled  = atLast;
  } else {
    document.getElementById('pageInfo').textContent = (members || []).length + ' result(s)';
    ['firstBtn','prevBtn','nextBtn','lastBtn'].forEach(id => document.getElementById(id).disabled = true);
  }

  const tbody = document.getElementById('tbody');
  if (!members || members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b">No results found</td></tr>';
    return;
  }
  tbody.innerHTML = members.map(m => {
    const taken = m.is_voter == 1 || m.is_voter === true;
    return '<tr class="' + (taken ? 'taken' : 'available') + '">' +
      '<td><span class="badge ' + (taken ? 'taken' : 'avail') + '">' +
        (taken ? '&#10005; Registered' : '&#10003; Available') + '</span></td>' +
      '<td><code>' + m.institution_id + '</code><button class="copy-btn" data-id="' + m.institution_id + '" onclick="copy(this.dataset.id)" title="Copy ID">copy</button></td>' +
      '<td>' + m.full_name + '</td>' +
      '<td style="color:#94a3b8">' + m.email + '</td>' +
      '<td><span class="role-badge ' + m.role + '">' + m.role + '</span></td>' +
      '<td style="color:#94a3b8">' + (m.department || '') + '</td>' +
      '<td style="color:#94a3b8">' + (m.year_level || '—') + '</td>' +
      '</tr>';
  }).join('');
}

function changePage(dir) {
  state.page = Math.max(1, Math.min(state.lastPage, state.page + dir));
  load();
}

function goToPage(n) {
  state.page = Math.max(1, Math.min(state.lastPage, n));
  load();
}

document.getElementById('search').addEventListener('input', function() {
  clearTimeout(debounceTimer);
  state.search = this.value.trim();
  state.page = 1;
  debounceTimer = setTimeout(load, 300);
});

document.querySelectorAll('.btn[data-role]').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.btn[data-role]').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    state.role = this.dataset.role;
    state.page = 1;
    load();
  });
});

const availBtn = document.getElementById('availBtn');
availBtn.addEventListener('click', function() {
  if (state.voterFilter === 'false') {
    state.voterFilter = null;
    this.classList.remove('active');
  } else {
    state.voterFilter = 'false';
    this.classList.add('active');
  }
  state.page = 1;
  load();
});

function copy(text) {
  navigator.clipboard.writeText(text).then(() => showMsg('Copied: ' + text));
}

function showMsg(msg) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

load();
// Auto-refresh every 10 seconds so registrations appear
setInterval(load, 10000);
</script>
</body>
</html>`);
});
// ─────────────────────────────────────────────────────────────────────────────

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
